import { redirect } from 'next/navigation';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import SuperAdminDashboardClient from './SuperAdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function SuperAdminDashboardPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    // If logged in as arena_admin, send to their dashboard
    if (context && (context.role === 'arena_admin' || context.role === 'security')) {
      redirect('/admin/dashboard');
    }
    redirect('/admin/super-admin-login');
  }

  return <SuperAdminDashboardClient />;
}
