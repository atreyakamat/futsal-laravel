/**
 * POST /api/fg-admin/arena/reschedule
 *
 * Arena Admin ONLY — reschedule a booking to a new date/time slot.
 * Arena Admins CANNOT issue refunds; they can only reschedule.
 *
 * Body: { ref: string, newDate: string, newSlot: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { readAuthUserId, readAuthRole } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { query } from '@/lib/domain';
import { z } from 'zod';

const schema = z.object({
  ref: z.string().min(1),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  newSlot: z.string().min(1, 'New time slot is required'),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await readAuthUserId();
    const role = await readAuthRole();

    if (!userId || role !== 'arena_admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized — Arena Admin only' }, { status: 401 });
    }

    const context = await getAdminContext(userId);
    if (!context?.arenaId) {
      return NextResponse.json({ success: false, message: 'No arena assigned to this admin' }, { status: 403 });
    }

    const payload = schema.parse(await req.json());

    // Verify booking belongs to this admin's arena
    const bookings = await query<any>(
      `SELECT * FROM bookings WHERE booking_ref = ? AND arena_id = ? LIMIT 10`,
      [payload.ref, context.arenaId]
    );

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found in your arena' }, { status: 404 });
    }

    if (bookings[0].payment_status === 'cancelled') {
      return NextResponse.json({ success: false, message: 'Cannot reschedule a cancelled booking' }, { status: 400 });
    }

    // Check the new slot is not already taken at the target date for this arena
    const conflicting = await query<any>(
      `SELECT id FROM bookings
        WHERE arena_id = ?
          AND booking_date = ?
          AND time_slot = ?
          AND payment_status IN ('confirmed', 'pending')
          AND booking_ref != ?
        LIMIT 1`,
      [context.arenaId, payload.newDate, payload.newSlot, payload.ref]
    );

    if (conflicting && conflicting.length > 0) {
      return NextResponse.json(
        { success: false, message: 'The requested slot is already booked for that date. Please choose another slot.' },
        { status: 409 }
      );
    }

    // Update all rows that share this booking_ref (multi-slot bookings)
    await query(
      `UPDATE bookings
          SET booking_date = ?,
              time_slot = ?,
              updated_at = NOW()
        WHERE booking_ref = ? AND arena_id = ?`,
      [payload.newDate, payload.newSlot, payload.ref, context.arenaId]
    );

    return NextResponse.json({
      success: true,
      message: `Booking ${payload.ref} rescheduled to ${payload.newDate} at ${payload.newSlot}.`,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: err.errors }, { status: 400 });
    }
    console.error('[Arena Reschedule Error]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
