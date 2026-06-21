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

    // Fetch timings for this arena
    const timings = await query<{
      id: number;
      time_slot: string;
      start_time: string;
      end_time: string;
      day_of_week: number | null;
    }>(
      'SELECT id, time_slot, start_time, end_time, day_of_week FROM slot_timings WHERE arena_id = ? ORDER BY day_of_week ASC, start_time ASC',
      [arenaId]
    );

    return NextResponse.json({
      success: true,
      data: timings,
    });
  } catch (error) {
    console.error('Arena timings error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}