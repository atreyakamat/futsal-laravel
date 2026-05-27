import { readAuthUserId } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function AdminUsersPage() {
  const userId = await readAuthUserId();

  if (!userId) {
    redirect('/admin/login');
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-12">
        Manage <span className="text-primary">Users & Admins</span>
      </h1>

      <div className="glass-card text-center py-20">
        <span className="material-symbols-outlined text-6xl text-gray-700 block mb-6">admin_panel_settings</span>
        <h2 className="text-2xl font-bold mb-4">Admin Management</h2>
        <p className="text-gray-400">Manage users and admin roles here.</p>
      </div>
    </div>
  );
}
