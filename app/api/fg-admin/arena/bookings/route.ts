import { NextResponse } from 'next/server';
import { readAuthUserId, readArenaId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const userId = await readAuthUserId();
    const arenaId = await readArenaId();

    if (!userId || !arenaId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const context = await getAdminContext(userId);
    if (!context || context.role !== 'arena_admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Fetch bookings for this arena (most recent 50)
    const bookings = await query<{
      id: number;
      ticket_number: string;
      booking_ref: string;
      customer_name: string;
      customer_mobile: string;
      booking_date: string;
      time_slot: string;
      payment_status: string;
      amount: number;
      created_at: string;
    }>(`
      SELECT id, ticket_number, booking_ref, customer_name, customer_mobile, booking_date, time_slot, payment_status, amount, created_at
        FROM bookings
       WHERE arena_id = ?
       ORDER BY created_at DESC
       LIMIT 50
    `, [arenaId]);

    return NextResponse.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error('Arena bookings error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}