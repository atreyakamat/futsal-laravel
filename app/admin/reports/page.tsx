import { readAuthUserId } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function AdminReportsPage() {
  const userId = await readAuthUserId();

  if (!userId) {
    redirect('/admin/login');
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-12">
        <span className="text-primary">Reports</span> & Analytics
      </h1>

      <div className="glass-card text-center py-20">
        <span className="material-symbols-outlined text-6xl text-gray-700 block mb-6">analytics</span>
        <h2 className="text-2xl font-bold mb-4">Reports Dashboard</h2>
        <p className="text-gray-400">Analytics and reports will be displayed here.</p>
      </div>
    </div>
  );
}
