import { readAuthUserId } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const userId = await readAuthUserId();

  if (userId) {
    redirect('/admin/dashboard');
  } else {
    redirect('/admin/login');
  }

  return null;
}
