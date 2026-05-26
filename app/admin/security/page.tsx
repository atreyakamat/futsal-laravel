import { readAuthUserId } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminSecurityPage() {
  const userId = await readAuthUserId();

  if (!userId) {
    redirect('/admin/login');
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-12">
        <span className="text-primary">Security</span> Management
      </h1>

      <div className="glass p-10 rounded-[2.5rem] border border-white/10">
        <Link
          href="/security/scan"
          className="inline-flex items-center gap-3 px-8 py-6 rounded-2xl bg-primary text-black font-black text-xs tracking-widest hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined">qr_code_scanner</span>
          GO TO SECURITY PORTAL
        </Link>
      </div>
    </div>
  );
}
