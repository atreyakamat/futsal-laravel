import { readAuthUserId } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/admin';

export default async function AdminPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context) {
    redirect('/fg-admin/platform/login');
  }

  if (context.role === 'super_admin') {
    redirect('/fg-admin/platform/super-admin');
  }

  redirect('/fg-admin/platform/dashboard');

  return null;
}
