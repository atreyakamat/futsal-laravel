import { redirect } from 'next/navigation';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import SuperAdminDashboardClient from './SuperAdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function SuperAdminDashboardPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    // This full SuperAdminDashboardClient stays super_admin-exclusive (it
    // has refund/GST/account-management controls embedded inline
    // throughout, not yet cleanly separable) — manager, the platform-wide
    // arena_admin, and security all get sent to the simpler shared
    // dashboard instead.
    if (context && (context.role === 'arena_admin' || context.role === 'manager' || context.role === 'security')) {
      redirect('/fg-admin/platform/dashboard');
    }
    redirect('/fg-admin/login');
  }

  return <SuperAdminDashboardClient />;
}
