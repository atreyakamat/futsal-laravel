import { NextRequest, NextResponse } from 'next/server';
import { readAuthUserId, readAuthRole } from '@/lib/session';
import { query } from '@/lib/domain';

export async function POST(req: NextRequest) {
  try {
    const userId = await readAuthUserId();
    const role = await readAuthRole();
    
    // Only arena admin or super admin can refund
    if (!userId || (role !== 'arena_admin' && role !== 'super_admin')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { ref, refundAmount } = await req.json();
    if (!ref || typeof refundAmount !== 'number') {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    // Process the refund on the booking_ref
    await query(
      `UPDATE bookings 
          SET payment_status = 'cancelled', 
              refund_amount = ?, 
              cancellation_requested = FALSE
        WHERE booking_ref = ?`,
      [refundAmount, ref]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Refund Error]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
