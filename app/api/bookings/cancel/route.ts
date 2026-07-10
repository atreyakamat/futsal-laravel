import { NextRequest, NextResponse } from 'next/server';
import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/domain';

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

    // Verify ownership and timing
    const bookings = await query<any>(`SELECT * FROM bookings WHERE booking_ref = ? AND user_id = ?`, [ref, userId]);
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    const firstBooking = bookings[0];
    const slotStart = firstBooking.time_slot.split(' - ')[0];
    const bookingDateStr = firstBooking.booking_date; // YYYY-MM-DD
    
    // Construct Date assuming IST (UTC+5:30)
    const bookingDateTime = new Date(`${bookingDateStr}T${slotStart}:00+05:30`);
    const msUntilBooking = bookingDateTime.getTime() - Date.now();
    
    // Check if less than 6 hours away
    if (msUntilBooking < 6 * 60 * 60 * 1000) {
      return NextResponse.json({ success: false, message: 'Cancellations are only allowed up to 6 hours prior to the slot time.' }, { status: 400 });
    }

    // Mark as cancellation requested
    await query(
      `UPDATE bookings SET cancellation_requested = TRUE, cancellation_reason = 'User Requested' WHERE booking_ref = ? AND user_id = ?`,
      [ref, userId]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Cancel Booking Error]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
