import { readAuthUserId } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminArenasPage() {
  const userId = await readAuthUserId();

  if (!userId) {
    redirect('/admin/login');
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic">
          Manage <span className="text-primary">Arenas</span>
        </h1>
        <Link
          href="/admin/arenas/create"
          className="px-6 py-4 bg-primary text-black rounded-full font-black text-xs tracking-widest hover:scale-105 transition-all"
        >
          + CREATE ARENA
        </Link>
      </div>

      <div className="glass p-10 rounded-[2.5rem] border border-white/10 text-center py-20">
        <span className="material-symbols-outlined text-6xl text-gray-700 block mb-6">stadium</span>
        <h2 className="text-2xl font-bold mb-4">No Arenas Yet</h2>
        <p className="text-gray-400 mb-8">Create your first arena to get started.</p>
        <Link
          href="/admin/arenas/create"
          className="inline-block px-6 py-4 bg-primary text-black rounded-full font-black text-xs tracking-widest hover:scale-105 transition-all"
        >
          Create Arena
        </Link>
      </div>
    </div>
  );
}
