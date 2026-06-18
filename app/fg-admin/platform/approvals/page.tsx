import { readAuthUserId } from '@/lib/session';
import { getAdminContext, listApprovalRequests } from '@/lib/admin';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminApprovalsPage({ searchParams }: Props) {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    redirect('/fg-admin/platform/dashboard');
  }

  const resolvedSearchParams = await searchParams;
  const error = typeof resolvedSearchParams.error === 'string' ? resolvedSearchParams.error : null;
  const updated = typeof resolvedSearchParams.updated === 'string' ? resolvedSearchParams.updated : null;

  const requests = await listApprovalRequests({ status: 'pending' });

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Approval <span className="text-primary text-stroke">Queue</span>
        </h1>
        <p className="label-classic !ml-0">Review slot and entry requests from admins</p>
      </div>

      {error && (
        <div className="glass-card !p-6 border-red-500/20 bg-red-500/5 mb-8 flex items-center gap-4 text-red-500 rounded-2xl animate-fadeIn">
          <span className="material-symbols-outlined text-2xl">error</span>
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest">Failed to Resolve Request</h4>
            <p className="text-white/60 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {updated && (
        <div className="glass-card !p-6 border-primary/20 bg-primary/5 mb-8 flex items-center gap-4 text-primary rounded-2xl animate-fadeIn">
          <span className="material-symbols-outlined text-2xl">check_circle</span>
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest">Request Resolved Successfully</h4>
            <p className="text-white/60 text-xs mt-1">The request has been successfully resolved.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {(requests || []).map((request) => (
          <div key={request.id} className="glass-card !p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <p className="label-classic !ml-0">{request.request_type}</p>
                <h3 className="text-2xl font-black uppercase italic">{request.arena_name ?? `Arena #${request.arena_id}`}</h3>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-2">
                  Requested by {request.requested_by_name ?? 'Unknown'}
                </p>
              </div>

              <form action={`/api/fg-admin/platform/approvals/${request.id}`} method="POST" className="flex flex-wrap gap-3">
                <input type="hidden" name="decision" value="approved" />
                <button className="btn-primary" type="submit">Approve</button>
              </form>

              <form action={`/api/fg-admin/platform/approvals/${request.id}`} method="POST" className="flex flex-wrap gap-3">
                <input type="hidden" name="decision" value="rejected" />
                <input name="reason" placeholder="Reason" className="input-field !min-h-0 !py-3 !px-4" />
                <button className="btn-secondary" type="submit">Reject</button>
              </form>
            </div>

            <pre className="mt-6 p-4 rounded-2xl bg-black/20 border border-white/5 text-[10px] overflow-auto text-white/60">
              {request.payload_json}
            </pre>
          </div>
        ))}

        {(!requests || requests?.length === 0) && (
          <div className="glass-card text-center py-20">
            <p className="text-white/20 font-black uppercase tracking-widest italic">No pending approvals.</p>
          </div>
        )}
      </div>
    </div>
  );
}
