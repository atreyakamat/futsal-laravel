import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { getPlatformArenaAdmins } from '@/lib/super-admin';
import { redirect } from 'next/navigation';
import ArenaAdminsClient from '@/components/ArenaAdminsClient';

export const dynamic = 'force-dynamic';

export default async function ArenaAdminsPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    redirect('/fg-admin/login');
  }

  const admins = await getPlatformArenaAdmins();

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 space-y-12">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Manage <span className="text-primary text-stroke">Arena Admins</span>
        </h1>
        <p className="label-classic !ml-0">
          Platform-wide admins — one tier below super admin, with access across every turf.
        </p>
      </div>
      <ArenaAdminsClient initialAdmins={admins} />
    </div>
  );
}
