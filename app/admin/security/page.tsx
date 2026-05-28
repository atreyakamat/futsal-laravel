import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminSecurityPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context) {
    redirect('/admin/login');
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-12">
        <span className="text-primary">Security</span> Management
      </h1>

      <div className="glass-card">
        <Link
          href="/security/scan"
          className="btn-primary inline-flex items-center gap-3 !py-6"
        >
          <span className="material-symbols-outlined">qr_code_scanner</span>
          GO TO SECURITY PORTAL
        </Link>
        {context.role !== 'admin' && (
          <Link
            href="/admin/credentials"
            className="btn-secondary inline-flex items-center gap-3 !py-6 ml-4"
          >
            <span className="material-symbols-outlined">vpn_key</span>
            UPDATE SECURITY PASSCODE
          </Link>
        )}
      </div>
    </div>
  );
}
