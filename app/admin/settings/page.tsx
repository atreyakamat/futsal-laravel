import { readAuthUserId } from '@/lib/session';
import { query } from '@/lib/domain';
import { redirect } from 'next/navigation';

export default async function AdminSettingsPage() {
  const userId = await readAuthUserId();

  if (!userId) {
    redirect('/admin/login');
  }

  // Check if superadmin
  const user = await query<{ role: string }>(
    'SELECT role FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  if (user.length === 0 || user[0].role !== 'super_admin') {
    redirect('/admin/dashboard');
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-12">
        System <span className="text-primary">Settings</span>
      </h1>

      <div className="glass-card text-center py-20">
        <span className="material-symbols-outlined text-6xl text-gray-700 block mb-6">settings</span>
        <h2 className="text-2xl font-bold mb-4">Settings Management</h2>
        <p className="text-gray-400">System settings will be displayed here.</p>
      </div>
    </div>
  );
}
