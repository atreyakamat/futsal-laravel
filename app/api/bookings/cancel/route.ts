import { NextRequest, NextResponse } from 'next/server';
import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/domain';
import { isCancellationAllowed, calculateRefundAmount } from '@/lib/refund-policy';

export async function POST(req: NextRequest) {
  try {
    const userId = await readAuthUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { ref } = await req.json();
    if (!ref) {
      return NextResponse.json({ success: false, message: 'Booking ref is required' }, { status: 400 });
    }

    // Verify ownership
    const bookings = await query<any>(
      `SELECT * FROM bookings WHERE booking_ref = ? AND user_id = ?`,
      [ref, userId]
    );
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    const firstBooking = bookings[0];

    if (firstBooking.payment_status !== 'confirmed') {
      return NextResponse.json(
        { success: false, message: 'Only confirmed bookings can be cancelled.' },
        { status: 400 }
      );
    }

    const slotStart = firstBooking.time_slot.split(' - ')[0]; // e.g. "06:00"
    const { allowed } = isCancellationAllowed(firstBooking.booking_date, slotStart);

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Cancellations are only allowed at least 3 hours before the game. No refund is applicable for late cancellations.`,
          refundEligible: false,
        },
        { status: 400 }
      );
    }

    // Calculate refund (gross amount across all slots in this booking_ref)
    const grossAmount = bookings.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
    const { serviceFee, refundAmount } = calculateRefundAmount(grossAmount);

    // Mark as cancellation requested with refund amount pre-calculated
    await query(
      `UPDATE bookings
          SET cancellation_requested = TRUE,
              cancellation_reason = 'User Requested',
              refund_amount = ?,
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
