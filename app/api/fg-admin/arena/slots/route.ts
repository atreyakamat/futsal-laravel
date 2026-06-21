import { NextResponse } from 'next/server';
import { readAuthUserId, readArenaId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { getArenaPricing } from '@/lib/domain';
import { getArenaEntryMode } from '@/lib/admin';

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

    // Fetch pricing (slots) for this arena
    const slots = await getArenaPricing(arenaId);
    // Fetch entry mode
    const entryMode = await getArenaEntryMode(arenaId);

    return NextResponse.json({
      success: true,
      data: {
        slots,
        entryMode,
      },
    });
  } catch (error) {
    console.error('Arena slots error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}