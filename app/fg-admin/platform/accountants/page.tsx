import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { getAccountants } from '@/lib/super-admin';
import { redirect } from 'next/navigation';
import AccountantsClient from '@/components/AccountantsClient';

export const dynamic = 'force-dynamic';

export default async function AccountantsPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    redirect('/fg-admin/login');
  }

  const accountants = await getAccountants();

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 space-y-12">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Manage <span className="text-primary text-stroke">Accountants</span>
        </h1>
        <p className="label-classic !ml-0">
          Read-only financial access across all turfs — bookings, revenue, GST documents, refunds.
        </p>
      </div>
      <AccountantsClient initialAccountants={accountants} />
    </div>
  );
}
