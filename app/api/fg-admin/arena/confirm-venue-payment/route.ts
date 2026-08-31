/**
 * POST /api/fg-admin/arena/confirm-venue-payment
 *
 * Marks an offline (pay-at-venue) booking as paid once staff have collected
 * the UPI payment on the day of the slot. Callable by the arena's own
 * manager (scoped to their arena), or by any super_admin/arena_admin
 * (platform-wide, any arena).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext, createAdminAuditLog, hasArenaAccess } from '@/lib/admin';
import { query } from '@/lib/domain';
import { issueTaxInvoice } from '@/lib/gst-documents';
import { reportServerError } from '@/lib/error-log';

const schema = z.object({
  ref: z.string().min(1),
  reference: z.string().min(1, 'A UPI reference/UTR is required'),
  amount: z.number().nonnegative(),
});

export async function POST(request: Request) {
  try {
    const userId = await readAuthUserId();
    const context = await getAdminContext(userId);

    const allowedRoles = ['manager', 'super_admin', 'arena_admin'];
    if (!context || !allowedRoles.includes(context.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = schema.parse(await request.json());

    const bookings = await query<any>(
      `SELECT booking_ref, arena_id, payment_method, venue_payment_status
         FROM bookings
        WHERE booking_ref = ?
        LIMIT 1`,
      [payload.ref]
    );

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    // Managers may only confirm payments for their own arena's bookings;
    // a scoped arena_admin only for their assigned turf(s); super_admin
    // and a platform-wide (unscoped) arena_admin may confirm for any arena.
    if (context.role !== 'super_admin' && !hasArenaAccess(context, booking.arena_id)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    if (booking.payment_method !== 'offline') {
      return NextResponse.json({ success: false, message: 'This booking is not an offline/pay-at-venue booking' }, { status: 400 });
    }

    // Idempotent: an already-confirmed payment cannot be confirmed again.
    const updatedRows = await query<any>(
      `UPDATE bookings
          SET venue_payment_status = 'PAID',
              venue_payment_reference = ?,
              venue_payment_collected_by = ?,
              venue_payment_collected_at = NOW(),
              updated_at = NOW()
        WHERE booking_ref = ? AND payment_method = 'offline' AND venue_payment_status = 'UNPAID'
        RETURNING id`,
      [payload.reference.trim(), context.id, payload.ref]
    );

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ success: false, message: 'Payment already confirmed or booking not eligible (idempotent block)' }, { status: 400 });
    }

    await createAdminAuditLog({
      action: 'VENUE_PAYMENT_CONFIRMED',
      approvedBy: context.id,
      arenaId: booking.arena_id,
      fieldChanged: 'venue_payment_status',
      newValue: JSON.stringify({ ref: payload.ref, reference: payload.reference, amount: payload.amount }),
    });

    // Invoice-at-payment: this confirmation is the point of supply for
    // offline/pay-at-venue bookings, so issue the Tax Invoice here.
    await issueTaxInvoice(payload.ref);

    return NextResponse.json({ success: true, message: 'Venue payment confirmed.' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: err.errors }, { status: 400 });
    }
    reportServerError(err, { route: 'arena/confirm-venue-payment' });
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
