import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = await readAuthUserId();
    const context = await getAdminContext(userId);

    if (!context || context.role !== 'super_admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Fetch aggregate statistics
    const stats = await queryOne<any>(`
      SELECT 
        (SELECT COUNT(*) FROM arenas) as total_arenas,
        (SELECT COUNT(*) FROM bookings WHERE payment_status = 'success') as total_bookings,
        (SELECT COALESCE(SUM(amount), 0) FROM bookings WHERE payment_status = 'success') as total_revenue,
        (SELECT COUNT(DISTINCT customer_mobile) FROM bookings WHERE payment_status = 'success') as total_customers,
        (SELECT COUNT(*) FROM users WHERE role = 'arena_admin') as total_arena_admins,
        (SELECT COUNT(*) FROM users WHERE role = 'security') as total_security_staff
    `);

    // Fetch recent bookings trend (last 7 days)
    // For simplicity, we just return the raw values, we can calculate dates on client or here.
    
    return NextResponse.json({
      success: true,
      data: {
        totalArenas: Number(stats?.total_arenas || 0),
        totalBookings: Number(stats?.total_bookings || 0),
        totalRevenue: Number(stats?.total_revenue || 0),
        totalCustomers: Number(stats?.total_customers || 0),
        totalAdmins: Number(stats?.total_arena_admins || 0),
        totalSecurity: Number(stats?.total_security_staff || 0),
      }
    });
  } catch (error) {
    console.error('Failed to fetch super admin stats:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
