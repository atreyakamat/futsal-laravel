import { readAuthUserId } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function AdminBookingsPage() {
  const userId = await readAuthUserId();

  if (!userId) {
    redirect('/admin/login');
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-12">
        All <span className="text-primary">Bookings</span>
      </h1>

      <div className="glass p-10 rounded-[2.5rem] border border-white/10 text-center py-20">
        <span className="material-symbols-outlined text-6xl text-gray-700 block mb-6">book_online</span>
        <h2 className="text-2xl font-bold mb-4">Bookings Management</h2>
        <p className="text-gray-400">Bookings will be displayed here.</p>
      </div>
    </div>
  );
}
