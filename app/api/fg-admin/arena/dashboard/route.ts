import { NextResponse } from 'next/server';
import { readAuthUserId, readArenaId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { getArenaById } from '@/lib/domain';
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

    const arena = await getArenaById(arenaId);
    if (!arena) {
      return NextResponse.json({ success: false, message: 'Arena not found' }, { status: 404 });
    }

    // Get confirmed bookings count
    const confirmedResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM bookings WHERE arena_id = ? AND payment_status = ?',
      [arenaId, 'confirmed']
    );
    const confirmedBookings = Number(confirmedResult?.[0]?.count ?? 0);

    // Get total revenue (confirmed bookings)
    const revenueResult = await query<{ total: string }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM bookings WHERE arena_id = ? AND payment_status = ?',
      [arenaId, 'confirmed']
    );
    const totalRevenue = Number(revenueResult?.[0]?.total ?? 0);

    // Get unique customers (distinct customer_mobile)
    const uniqueResult = await query<{ count: string }>(
      'SELECT COUNT(DISTINCT customer_mobile) as count FROM bookings WHERE arena_id = ?',
      [arenaId]
    );
    const uniqueCustomers = Number(uniqueResult?.[0]?.count ?? 0);

    // Get pending approval requests
    const pendingRequests = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM approval_requests WHERE arena_id = ? AND status = ?',
      [arenaId, 'pending']
    );
    const pendingApprovals = Number(pendingRequests?.[0]?.count ?? 0);

    return NextResponse.json({
      success: true,
      data: {
        arena: { id: arena.id, name: arena.name, slug: arena.slug, status: arena.status },
        confirmedBookings,
        totalRevenue,
        uniqueCustomers,
        pendingApprovals,
      },
    });
  } catch (error) {
    console.error('Arena dashboard error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
