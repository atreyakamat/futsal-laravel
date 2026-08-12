import { readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { redirect } from 'next/navigation';
import GstDocumentsClient from '@/components/GstDocumentsClient';

export const dynamic = 'force-dynamic';

export default async function GstDocumentsPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    redirect('/fg-admin/login');
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          GST <span className="text-primary">Documents</span>
        </h1>
        <p className="label-classic !ml-0">
          Tax Invoices and Credit Notes, issued automatically at payment / refund time.
        </p>
      </div>
      <GstDocumentsClient />
    </div>
  );
}
