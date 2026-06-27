import { NextResponse } from 'next/server';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { query } from '@/lib/domain';

export async function GET() {
  try {
    const userId = await readAuthUserId();
    const admin = await getAdminContext(userId);

    if (!admin || admin.role !== 'super_admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const [usersCount] = await query<{ count: string }>('SELECT COUNT(*) as count FROM users');
    const [arenasCount] = await query<{ count: string }>('SELECT COUNT(*) as count FROM arenas');
    const [bookingsCount] = await query<{ count: string }>('SELECT COUNT(*) as count FROM bookings');
    const [revenueResult] = await query<{ total: string }>('SELECT SUM(amount) as total FROM bookings WHERE payment_status = \'confirmed\'');

    return NextResponse.json({
      success: true,
      data: {
        users: Number(usersCount?.count || 0),
        arenas: Number(arenasCount?.count || 0),
        bookings: Number(bookingsCount?.count || 0),
        revenue: Number(revenueResult?.total || 0),
      }
    });
  } catch (error) {
    console.error('Failed to fetch platform dashboard stats:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
