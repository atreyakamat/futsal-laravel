import { NextResponse } from 'next/server';
import { getBookingsForUser, getArenaById } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';

export async function GET() {
  const userId = await readAuthUserId();

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const bookings = await getBookingsForUser(userId);

  const arenaCache: Record<number, { name: string }> = {};
  for (const b of bookings) {
    if (!arenaCache[b.arena_id]) {
      const arena = await getArenaById(b.arena_id);
      if (arena) arenaCache[b.arena_id] = arena;
    }
  }

  const enriched = bookings.map((b) => ({
    ...b,
    arena_name: arenaCache[b.arena_id]?.name || 'Arena',
  }));

  return NextResponse.json({ success: true, data: enriched });
}
