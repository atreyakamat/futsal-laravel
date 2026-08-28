import { NextRequest, NextResponse } from 'next/server';
import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/domain';
import { evaluateCancellationEligibility, calculateRefundAmount } from '@/lib/refund-policy';
import { getCustomerRefundEnabled } from '@/lib/admin';
import { reportServerError } from '@/lib/error-log';

export async function POST(req: NextRequest) {
  try {
    const userId = await readAuthUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { ref } = await req.json();
    if (!ref) {
      return NextResponse.json({ success: false, message: 'Booking reference is required' }, { status: 400 });
    }

    // Fetch all slot rows for this parent booking_ref belonging to user
    const bookings = await query<any>(
      `SELECT * FROM bookings WHERE booking_ref = ? AND user_id = ?`,
      [ref, userId]
    );

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    const firstBooking = bookings[0];

    // Rule: Reject duplicate cancellation requests
    if (firstBooking.cancellation_requested || firstBooking.payment_status === 'cancelled' || firstBooking.payment_status === 'refunded') {
      return NextResponse.json(
        {
          success: false,
          code: 'CANCELLATION_ALREADY_REQUESTED',
          message: 'A cancellation request has already been submitted for this booking.',
          refundEligible: false,
        },
        { status: 400 }
      );
    }

    // Rule: Must be a confirmed booking
    if (firstBooking.payment_status !== 'confirmed') {
      return NextResponse.json(
        {
          success: false,
          code: 'NOT_CONFIRMED',
          message: 'Only confirmed bookings can be cancelled.',
          refundEligible: false,
        },
        { status: 400 }
      );
    }

    // Fetch dynamic cancellation cutoff setting
    const settingRes = await query<any>(
      `SELECT value FROM settings WHERE key = 'cancellation_cutoff_hours'`
    );
    let cutoffHours = 24;
    if (settingRes && settingRes.length > 0 && settingRes[0].value) {
      const parsed = parseInt(settingRes[0].value, 10);
      if (!isNaN(parsed) && parsed >= 24 && parsed <= 72) {
        cutoffHours = parsed;
      }
    }

    // Rule: Evaluate server-side time eligibility across all slots in BookingGroup.
    // Cancellation itself is always allowed up until the game ends — only refund
    // eligibility is time-boxed, by both the before-play cutoff and the invoice
    // month (bookings.created_at, i.e. when this booking was paid for).
    const timeSlots = bookings.map((b: any) => b.time_slot);
    const eligibility = evaluateCancellationEligibility(firstBooking.booking_date, timeSlots, Date.now(), cutoffHours, firstBooking.created_at);

    if (!eligibility.allowed) {
      return NextResponse.json(
        {
          success: false,
          code: eligibility.code,
          message: eligibility.message,
          refundEligible: false,
        },
        { status: 400 }
      );
    }

    // Calculate gross total across all slots in BookingGroup
    const { getRefundPolicyConfig } = await import('@/lib/domain');
    const refundPolicyConfig = await getRefundPolicyConfig();
    const grossAmount = bookings.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
    const { serviceFee, refundAmount } = calculateRefundAmount(grossAmount, refundPolicyConfig, bookings.length);

    // Default policy: refund-eligible cancellation, gated by
    // evaluateCancellationEligibility's time window above. A super_admin/
    // arena_admin can still always force a refund manually
    // (app/api/fg-admin/super-admin/refund) regardless of this outcome.
    // customer_refund_enabled is a per-arena opt-OUT — when false, that
    // arena never owes a refund (reschedule is the only self-service remedy).
    const refundsEnabledForArena = await getCustomerRefundEnabled(firstBooking.arena_id);

    const isOfflineBooking = firstBooking.payment_method === 'offline';
    const wasVenuePaymentCollected = isOfflineBooking && firstBooking.venue_payment_status === 'PAID';
    const noRefundDue = !refundsEnabledForArena || !eligibility.refundEligible || (isOfflineBooking && !wasVenuePaymentCollected);

    // Cancelling frees the slot immediately (payment_status -> 'cancelled', so
    // it drops out of the active-slot query) — the actual refund still
    // requires a super admin to process it via /api/fg-admin/super-admin/refund,
    // tracked separately via refund_status/cancellation_requested. Guarded
    // atomically on payment_status = 'confirmed' to avoid a double-cancel race.
    const updatedRows = await query<{ id: number }>(
      `UPDATE bookings
          SET payment_status = 'cancelled',
              cancellation_requested = TRUE,
              cancellation_reason = 'User Requested',
              refund_amount = ?,
              refund_status = ?,
              updated_at = NOW()
        WHERE booking_ref = ? AND user_id = ? AND payment_status = 'confirmed'
        RETURNING id`,
      [noRefundDue ? 0 : refundAmount, noRefundDue ? 'NOT_APPLICABLE' : 'PENDING_REVIEW', ref, userId]
    );

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'CANCELLATION_ALREADY_REQUESTED',
          message: 'This booking was already cancelled or is no longer confirmed.',
          refundEligible: false,
        },
        { status: 400 }
      );
    }

    if (noRefundDue) {
      let message: string;
      if (isOfflineBooking && !wasVenuePaymentCollected) {
        message = 'Booking cancelled and the slot has been released. This was a pay-at-venue booking and no payment was collected, so no refund is due.';
      } else if (!refundsEnabledForArena) {
        message = 'Booking cancelled and the slot has been released. No refund is issued for cancellations at this arena — rescheduling to a new slot is available instead.';
      } else if (eligibility.code === 'NO_REFUND_MONTH_EXPIRED') {
        message = 'Booking cancelled and the slot has been released. The refund window for this booking (through the end of the month it was paid in) has closed, so no refund is due.';
      } else {
        message = `Booking cancelled and the slot has been released. This booking started within ${cutoffHours} hours, so it is not eligible for a refund.`;
      }
      return NextResponse.json({
        success: true,
        message,
        refundEligible: false,
        grossAmount,
        serviceFee: 0,
        refundAmount: 0,
      });
    }

    return NextResponse.json({
      success: true,
      message: wasVenuePaymentCollected
        ? 'Booking cancelled and the slot has been released. Since this was paid at the venue, our team will arrange the refund manually.'
        : 'Booking cancelled and the slot has been released. Your refund will be processed by our team shortly.',
      refundEligible: true,
      grossAmount,
      serviceFee,
      refundAmount,
    });
  } catch (err: any) {
    reportServerError(err, { route: 'bookings/cancel' });
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
