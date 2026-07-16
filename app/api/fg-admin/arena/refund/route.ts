import { NextRequest, NextResponse } from 'next/server';
import { readAuthUserId, readAuthRole } from '@/lib/session';
import { query } from '@/lib/domain';
import { z } from 'zod';

const refundSchema = z.object({
  ref: z.string().min(1),
  refundAmount: z.number().nonnegative(),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await readAuthUserId();
    const role = await readAuthRole();
    
    // Only arena admin or super admin can refund
    if (!userId || (role !== 'arena_admin' && role !== 'super_admin')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = refundSchema.parse(await req.json());

    const bookings = await query<any>(
      `SELECT booking_ref, cancellation_requested
         FROM bookings
        WHERE booking_ref = ?
        LIMIT 1`,
      [payload.ref]
    );

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    if (!bookings[0].cancellation_requested) {
      return NextResponse.json({ success: false, message: 'Cancellation has not been requested for this booking' }, { status: 400 });
    }

    // Process the refund on the booking_ref
    await query(
      `UPDATE bookings 
          SET payment_status = 'cancelled', 
              refund_amount = ?, 
              cancellation_requested = FALSE,
              cancellation_reason = 'Refund processed by admin',
              updated_at = NOW()
        WHERE booking_ref = ?`,
      [payload.refundAmount, payload.ref]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Refund Error]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
