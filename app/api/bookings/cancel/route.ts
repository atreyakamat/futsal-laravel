import { NextRequest, NextResponse } from 'next/server';
import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/domain';
import { evaluateCancellationEligibility, calculateRefundAmount } from '@/lib/refund-policy';

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
    let cutoffHours = 3;
    if (settingRes && settingRes.length > 0 && settingRes[0].value) {
      const parsed = parseInt(settingRes[0].value, 10);
      if (!isNaN(parsed) && parsed >= 3 && parsed <= 12) {
        cutoffHours = parsed;
      }
    }

    // Rule: Evaluate server-side time eligibility across all slots in BookingGroup
    const timeSlots = bookings.map((b: any) => b.time_slot);
    const eligibility = evaluateCancellationEligibility(firstBooking.booking_date, timeSlots, Date.now(), cutoffHours);

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
    const grossAmount = bookings.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
    const { serviceFee, refundAmount } = calculateRefundAmount(grossAmount);

    // Atomically mark parent BookingGroup as cancellation requested with PENDING_REVIEW status
    await query(
      `UPDATE bookings
          SET cancellation_requested = TRUE,
              cancellation_reason = 'User Requested',
              refund_amount = ?,
              refund_status = 'PENDING_REVIEW',
              updated_at = NOW()
        WHERE booking_ref = ? AND user_id = ?`,
      [refundAmount, ref, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Cancellation request submitted. Our team will process your refund shortly.',
      refundEligible: true,
      grossAmount,
      serviceFee,
      refundAmount,
    });
  } catch (err: any) {
    console.error('[API Cancel Booking Error]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
