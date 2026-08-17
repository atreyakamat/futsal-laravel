import { NextResponse } from 'next/server';
import { readAuthUserId, readArenaId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { query, groupBookingRows } from '@/lib/domain';
import type { BookingRow } from '@/lib/types';

export async function GET() {
  try {
    const userId = await readAuthUserId();
    const arenaId = await readArenaId();

    if (!userId || !arenaId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const context = await getAdminContext(userId);
    if (!context || context.role !== 'manager') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Fetch raw booking rows for this arena (most recent 200)
    const rawRows = await query<BookingRow>(`
      SELECT *
        FROM bookings
       WHERE arena_id = ?
       ORDER BY created_at DESC
       LIMIT 200
    `, [arenaId]);

    // Aggregate raw slot rows into domain BookingGroup parent entities
    const groupedBookings = groupBookingRows(rawRows);

    return NextResponse.json({
      success: true,
      data: groupedBookings,
    });
  } catch (error) {
    console.error('Arena bookings error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}