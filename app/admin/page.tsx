import { readAuthUserId } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/admin';

export default async function AdminPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context) {
    redirect('/admin/login');
  }

  if (context.role === 'super_admin') {
    redirect('/admin/super-admin');
  }

  redirect('/admin/dashboard');

  return null;
}
