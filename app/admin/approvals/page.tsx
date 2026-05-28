import { readAuthUserId } from '@/lib/session';
import { getAdminContext, listApprovalRequests } from '@/lib/admin';
import { redirect } from 'next/navigation';

export default async function AdminApprovalsPage() {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);

  if (!context || context.role !== 'super_admin') {
    redirect('/admin/dashboard');
  }

  const requests = await listApprovalRequests({ status: 'pending' });

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Approval <span className="text-primary text-stroke">Queue</span>
        </h1>
        <p className="label-classic !ml-0">Review slot and entry requests from admins</p>
      </div>

      <div className="grid gap-6">
        {requests.map((request) => (
          <div key={request.id} className="glass-card !p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <p className="label-classic !ml-0">{request.request_type}</p>
                <h3 className="text-2xl font-black uppercase italic">{request.arena_name ?? `Arena #${request.arena_id}`}</h3>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-2">
                  Requested by {request.requested_by_name ?? 'Unknown'}
                </p>
              </div>

              <form action={`/api/admin/approvals/${request.id}`} method="POST" className="flex flex-wrap gap-3">
                <input type="hidden" name="decision" value="approved" />
                <button className="btn-primary" type="submit">Approve</button>
              </form>

              <form action={`/api/admin/approvals/${request.id}`} method="POST" className="flex flex-wrap gap-3">
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

        {requests.length === 0 && (
          <div className="glass-card text-center py-20">
            <p className="text-white/20 font-black uppercase tracking-widest italic">No pending approvals.</p>
          </div>
        )}
      </div>
    </div>
  );
}
