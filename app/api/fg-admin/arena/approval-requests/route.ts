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

    // Fetch approval requests for this arena
    const approvalRequests = await query<{
      id: number;
      request_type: string;
      status: string;
      notes: string | null;
      created_at: string;
    }>(
      'SELECT id, request_type, status, notes, created_at FROM approval_requests WHERE arena_id = ? ORDER BY created_at DESC LIMIT 100',
      [arenaId]
    );

    return NextResponse.json({
      success: true,
      data: approvalRequests,
    });
  } catch (error) {
    console.error('Arena approval requests error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}