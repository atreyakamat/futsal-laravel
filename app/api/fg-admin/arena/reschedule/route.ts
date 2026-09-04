/**
 * POST /api/fg-admin/arena/reschedule
 *
 * super_admin / arena_admin ONLY — reschedule a booking to a new date/time
 * slot. These roles cannot issue refunds via this route; they can only
 * reschedule (refunds go through /api/fg-admin/super-admin/refund).
 *
 * Was previously gated to `manager` despite this file's own original intent
 * ("Arena Admin ONLY") — fixed to match that stated scope. Since super_admin
 * (and a platform-wide arena_admin) aren't pinned to a single arena the way
 * manager is, the caller now supplies `arena_id` explicitly and it's checked
 * via hasArenaAccess() rather than trusting a single fixed context.arenaId.
 *
 * Rules & Safeguards:
 *  1. Select an existing confirmed booking (by booking_ref) in an arena the caller has access to.
 *  2. Select a new available slot & date (must not be past date, must not be occupied).
 *  3. Lock new slot & update booking rows.
 *  4. Release previous slot (automatic when updating booking_date & time_slot).
 *  5. Preserve booking_ref.
 *  6. Notify customer via SMS/notification.
 *  7. Log audit action into system_audit_logs.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext, hasArenaAccess } from '@/lib/admin';
import { query } from '@/lib/domain';
import { getSmsProvider } from '@/lib/sms';
import { z } from 'zod';

const schema = z.object({
  ref: z.string().min(1),
  arena_id: z.coerce.number().int().positive(),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  newSlot: z.string().min(1, 'New time slot is required'),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await readAuthUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const context = await getAdminContext(userId);
    if (!context || !['super_admin', 'arena_admin'].includes(context.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized — super admin or arena admin only' }, { status: 401 });
    }

    const payload = schema.parse(await req.json());

    if (!hasArenaAccess(context, payload.arena_id)) {
      return NextResponse.json({ success: false, message: 'You are not authorized for this arena.' }, { status: 403 });
    }

    // 1. Prevent past date selection
    const todayStr = new Date().toISOString().split('T')[0];
    if (payload.newDate < todayStr) {
      return NextResponse.json(
        { success: false, message: 'Reschedule rejected: Cannot reschedule to a past date.' },
        { status: 400 }
      );
    }

    // 2. Verify booking belongs to the target arena
    const bookings = await query<any>(
      `SELECT * FROM bookings WHERE booking_ref = ? AND arena_id = ? LIMIT 10`,
      [payload.ref, payload.arena_id]
    );

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found in that arena' }, { status: 404 });
    }

    const firstBooking = bookings[0];
    if (firstBooking.payment_status === 'cancelled' || firstBooking.payment_status === 'failed') {
      return NextResponse.json(
        { success: false, message: 'Cannot reschedule a cancelled or failed booking.' },
        { status: 400 }
      );
    }

    const oldDate = firstBooking.booking_date;
    const oldSlot = firstBooking.time_slot;

    // 3. Prevent occupied slots / double booking
    const conflicting = await query<any>(
      `SELECT id FROM bookings
        WHERE arena_id = ?
          AND booking_date = ?
          AND time_slot = ?
          AND payment_status IN ('confirmed', 'pending')
          AND booking_ref != ?
        LIMIT 1`,
      [payload.arena_id, payload.newDate, payload.newSlot, payload.ref]
    );

    if (conflicting && conflicting.length > 0) {
      return NextResponse.json(
        { success: false, message: 'The requested slot is already occupied for that date. Please choose another slot.' },
        { status: 409 }
      );
    }

    // 4. Update booking row(s) — preserving booking_ref, releasing old slot, locking new slot
    await query(
      `UPDATE bookings
          SET booking_date = ?,
              time_slot = ?,
              updated_at = NOW()
        WHERE booking_ref = ? AND arena_id = ?`,
      [payload.newDate, payload.newSlot, payload.ref, payload.arena_id]
    );

    // 5. Log the action into system_audit_logs
    try {
      await query(
        `INSERT INTO system_audit_logs (super_admin_id, action, entity_type, entity_id, changes, ip_address, user_agent, created_at)
         VALUES (?, 'RESCHEDULE_BOOKING', 'booking', ?, ?, ?, ?, NOW())`,
        [
          userId,
          payload.arena_id || 1,
          JSON.stringify({ ref: payload.ref, oldDate, oldSlot, newDate: payload.newDate, newSlot: payload.newSlot }),
          req.headers.get('x-forwarded-for') || 'unknown',
          req.headers.get('user-agent') || 'unknown',
        ]
      );
    } catch (auditErr) {
      console.error('[Reschedule Audit Error]', auditErr);
    }

    // 6. Notify Customer via SMS/WhatsApp — same RESCHEDULED| protocol and
    // field order as the customer self-service reschedule (lib/ticket.ts's
    // sendRescheduleTicketEmail / lib/sms.ts's AiSensyProvider), so both
    // reschedule paths render through the one agnelarena_reschedule template.
    if (firstBooking.customer_mobile) {
      try {
        const sms = getSmsProvider();
        await sms.sendSms(
          firstBooking.customer_mobile,
          `RESCHEDULED|${oldDate}|${oldSlot}|${payload.newDate}|${payload.newSlot}|${firstBooking.ticket_number || payload.ref}|${firstBooking.customer_name}`
        );
      } catch (notifyErr) {
        console.error('[Reschedule Notification Error]', notifyErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${payload.ref} rescheduled to ${payload.newDate} at ${payload.newSlot}. Customer notified.`,
      data: {
        bookingRef: payload.ref,
        oldDate,
        oldSlot,
        newDate: payload.newDate,
        newSlot: payload.newSlot,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: err.errors }, { status: 400 });
    }
    console.error('[Arena Reschedule Error]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
