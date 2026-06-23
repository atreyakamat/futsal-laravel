import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getBookingsByRef, markPaymentFailed, query } from '@/lib/domain';

const bodySchema = z.object({
  booking_ref: z.string().min(1),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());

    const bookings = await getBookingsByRef(payload.booking_ref);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    if (bookings[0].payment_status === 'confirmed') {
      return NextResponse.json({ success: false, message: 'Booking already confirmed' }, { status: 400 });
    }

    await markPaymentFailed(payload.booking_ref);

    // Log the failure
    try {
      await query(
        `INSERT INTO payment_audit_logs (booking_ref, status, amount, mihpayid, payload, created_at)
         VALUES (?, 'failed', 0, NULL, ?, CURRENT_TIMESTAMP)`,
        [payload.booking_ref, JSON.stringify({ reason: payload.reason })]
      );
    } catch (logErr) {
      console.error('Failed to log payment failure:', logErr);
    }

    return NextResponse.json({ success: true, message: 'Payment marked as failed' });
  } catch (error) {
    console.error('Payment failure handler error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid input', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
