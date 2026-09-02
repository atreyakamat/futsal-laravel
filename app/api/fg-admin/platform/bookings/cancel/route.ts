import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext, hasArenaAccess } from '@/lib/admin';
import { query, getRefundPolicyConfig } from '@/lib/domain';
import { calculateRefundAmount } from '@/lib/refund-policy';
import { logAuditAction } from '@/lib/super-admin';

const schema = z.object({
  booking_ref: z.string().min(1),
  reason: z.string().optional(),
});

/**
 * Staff-side cancellation — the only way to cancel a booking created via
 * app/api/fg-admin/platform/bookings (admin_created = TRUE), since customers
 * are blocked from self-cancelling those (see app/api/bookings/cancel).
 * Works on any booking a staff member has arena access to, pending or
 * confirmed either way:
 *  - pending (never paid): cancelled outright, nothing to refund.
 *  - confirmed (paid): dropped into the same refund-review queue a
 *    customer's own cancellation would (refund_status = 'PENDING_REVIEW'),
 *    so FORCE REFUND / DECLINE on /fg-admin/platform/cancellations handles
 *    the payout exactly like any other cancellation.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await readAuthUserId();
    const context = await getAdminContext(userId);
    if (!context || !['super_admin', 'admin', 'arena_admin', 'manager'].includes(context.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const payload = schema.parse(await req.json());
    const bookings = await query<any>('SELECT * FROM bookings WHERE booking_ref = ?', [payload.booking_ref]);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }
    const firstBooking = bookings[0];

    if (!hasArenaAccess(context, firstBooking.arena_id)) {
      return NextResponse.json({ success: false, message: 'You are not authorized for this arena.' }, { status: 403 });
    }

    if (!['pending', 'confirmed'].includes(firstBooking.payment_status)) {
      return NextResponse.json({ success: false, message: 'Only pending or confirmed bookings can be cancelled.' }, { status: 400 });
    }

    const reason = `Staff Cancelled: ${payload.reason?.trim() || 'No reason given'}`;

    if (firstBooking.payment_status === 'pending') {
      const updated = await query<{ id: number }>(
        `UPDATE bookings
            SET payment_status = 'cancelled',
                cancellation_requested = TRUE,
                cancellation_reason = ?,
                refund_amount = 0,
                refund_status = 'NOT_APPLICABLE',
                updated_at = NOW()
          WHERE booking_ref = ? AND payment_status = 'pending'
          RETURNING id`,
        [reason, payload.booking_ref]
      );
      if (!updated || updated.length === 0) {
        return NextResponse.json({ success: false, message: 'Booking is no longer pending — it may have just been paid or already cancelled.' }, { status: 400 });
      }
    } else {
      const refundPolicyConfig = await getRefundPolicyConfig();
      const grossAmount = bookings.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
      const isOfflineBooking = firstBooking.payment_method === 'offline';
      const wasVenuePaymentCollected = isOfflineBooking && firstBooking.venue_payment_status === 'PAID';
      const noRefundDue = isOfflineBooking && !wasVenuePaymentCollected;
      const { refundAmount } = calculateRefundAmount(grossAmount, refundPolicyConfig, bookings.length);

      const updated = await query<{ id: number }>(
        `UPDATE bookings
            SET payment_status = 'cancelled',
                cancellation_requested = TRUE,
                cancellation_reason = ?,
                refund_amount = ?,
                refund_status = ?,
                updated_at = NOW()
          WHERE booking_ref = ? AND payment_status = 'confirmed'
          RETURNING id`,
        [reason, noRefundDue ? 0 : refundAmount, noRefundDue ? 'NOT_APPLICABLE' : 'PENDING_REVIEW', payload.booking_ref]
      );
      if (!updated || updated.length === 0) {
        return NextResponse.json({ success: false, message: 'Booking is no longer confirmed — it may have just been cancelled elsewhere.' }, { status: 400 });
      }
    }

    await logAuditAction(
      context.id,
      'ADMIN_CANCEL_BOOKING',
      'booking',
      firstBooking.id,
      { bookingRef: payload.booking_ref, reason, previousStatus: firstBooking.payment_status },
      req.headers.get('x-forwarded-for') || 'unknown',
      req.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({ success: true, message: 'Booking cancelled.' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 });
    }
    console.error('Admin cancel booking error', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
