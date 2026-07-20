import { readAuthUserId } from '@/lib/session';
import { getAdminContext, listApprovalRequests } from '@/lib/admin';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  slot_template_update: 'Slot Pricing Update',
  entry_mode_update: 'Entry Mode Change',
  FREE_BOOKING_REQUEST: 'Free Booking Request',
  timing_update: 'Arena Timing Update',
  ARENA_UPDATE: 'Arena Info Update',
  BLOCK_SLOT_REQUEST: 'Slot Block Request',
  image_update: 'Arena Image Update',
  password_change: 'Password Change Request',
};

const REQUEST_ICONS: Record<string, string> = {
  slot_template_update: 'payments',
  entry_mode_update: 'toggle_on',
  FREE_BOOKING_REQUEST: 'event_available',
  timing_update: 'schedule',
  ARENA_UPDATE: 'edit_location',
  BLOCK_SLOT_REQUEST: 'block',
  image_update: 'image',
  password_change: 'lock',
};

function parsePayload(json: string | null): Record<string, unknown> {
  try { return json ? JSON.parse(json) : {}; } catch { return {}; }
}

function PayloadSummary({ requestType, payloadJson }: { requestType: string; payloadJson: string | null }) {
  const payload = parsePayload(payloadJson);

  if (requestType === 'FREE_BOOKING_REQUEST') {
    const slots = Array.isArray(payload.slots) ? (payload.slots as string[]).join(', ') : String(payload.slots ?? '');
    return (
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Date</p>
          <p className="text-sm font-black text-white mt-0.5">{String(payload.bookingDate ?? '—')}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Time Slots</p>
          <p className="text-sm font-black text-white mt-0.5">{slots || '—'}</p>
        </div>
        {Boolean(payload.customerName) && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 col-span-2">
            <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Requested For</p>
            <p className="text-sm font-black text-white mt-0.5">{String(payload.customerName ?? '')}</p>
          </div>
        )}
      </div>
    );
  }

  if (requestType === 'slot_template_update') {
    const slots = Array.isArray(payload.slots) ? (payload.slots as any[]) : [];
    return (
      <div className="mt-4">
        <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-2">New Slot Pricing</p>
        <div className="grid grid-cols-3 gap-2">
          {slots.map((s: any, i: number) => (
            <div key={i} className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
              <p className="text-[10px] text-white/60 font-bold">{s.time_slot}</p>
              <p className="text-sm font-black text-primary">₹{s.price}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (requestType === 'entry_mode_update') {
    const mode = String(payload.mode ?? 'open');
    return (
      <div className="mt-4">
        <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-2">Requested Mode</p>
        <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${
          mode === 'open' ? 'text-primary border-primary/30 bg-primary/10' :
          mode === 'blocked' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
          'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
        }`}>{mode}</span>
      </div>
    );
  }

  if (requestType === 'ARENA_UPDATE') {
    const fields = Object.entries(payload).filter(([k]) => !['arena_id'].includes(k));
    return (
      <div className="mt-4 grid grid-cols-2 gap-2">
        {fields.map(([key, val]) => (
          <div key={key} className="p-2 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">{key.replace(/_/g, ' ')}</p>
            <p className="text-xs text-white/80 mt-0.5 truncate">{String(val ?? '—')}</p>
          </div>
        ))}
      </div>
    );
  }

  if (requestType === 'timing_update') {
    return (
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Slot</p>
          <p className="text-sm font-black text-white mt-0.5">{String(payload.time_slot ?? '—')}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Start</p>
          <p className="text-sm font-black text-white mt-0.5">{String(payload.start_time ?? '—')}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">End</p>
          <p className="text-sm font-black text-white mt-0.5">{String(payload.end_time ?? '—')}</p>
        </div>
      </div>
    );
  }

  if (requestType === 'BLOCK_SLOT_REQUEST') {
    const slots = Array.isArray(payload.slots) ? (payload.slots as string[]).join(', ') : '';
    return (
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Date</p>
          <p className="text-sm font-black text-white mt-0.5">{String(payload.bookingDate ?? '—')}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Slots</p>
          <p className="text-sm font-black text-white mt-0.5">{slots || '—'}</p>
        </div>
      </div>
    );
  }

  // Fallback: raw json
  return (
    <pre className="mt-4 p-4 rounded-2xl bg-black/20 border border-white/5 text-[10px] overflow-auto text-white/50 max-h-32">
      {payloadJson}
    </pre>
  );
}

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
      <div className="mb-12 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
            Approval <span className="text-primary text-stroke">Queue</span>
          </h1>
          <p className="label-classic !ml-0">Review and action pending requests from Arena Admins</p>
        </div>
        {requests && requests.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <span className="material-symbols-outlined text-yellow-500 text-sm">pending</span>
            <span className="text-yellow-500 font-black text-sm">{requests.length} Pending</span>
          </div>
        )}
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
            <p className="text-white/60 text-xs mt-1">The request has been processed and the arena admin has been notified.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {(requests || []).map((request) => (
          <div key={request.id} className="glass-card !p-8 border border-white/5 hover:border-white/10 transition-all">
            {/* Request header */}
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-lg">
                      {REQUEST_ICONS[request.request_type] ?? 'assignment'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">
                      {new Date(request.created_at).toLocaleString('en-IN', {
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    <p className="font-black text-primary text-xs uppercase tracking-wider">
                      {REQUEST_TYPE_LABELS[request.request_type] ?? request.request_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                <h3 className="text-2xl font-black uppercase italic">
                  {request.arena_name ?? `Arena #${request.arena_id}`}
                </h3>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">
                  Requested by {request.requested_by_name ?? 'Unknown Admin'}
                </p>

                {/* Payload Summary */}
                <PayloadSummary requestType={request.request_type} payloadJson={request.payload_json} />

                {request.notes && (
                  <p className="text-xs text-white/50 italic mt-3 border-l-2 border-white/10 pl-3">
                    "{request.notes}"
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 min-w-48">
                <form action={`/api/fg-admin/platform/approvals/${request.id}`} method="POST">
                  <input type="hidden" name="decision" value="approved" />
                  <button className="btn-primary w-full flex items-center justify-center gap-2" type="submit">
                    <span className="material-symbols-outlined text-sm">check</span>
                    APPROVE
                  </button>
                </form>

                <form action={`/api/fg-admin/platform/approvals/${request.id}`} method="POST" className="space-y-2">
                  <input type="hidden" name="decision" value="rejected" />
                  <input
                    name="reason"
                    placeholder="Rejection reason (optional)"
                    className="input-field !min-h-0 !py-3 !text-xs"
                  />
                  <button className="btn-secondary w-full flex items-center justify-center gap-2" type="submit">
                    <span className="material-symbols-outlined text-sm">close</span>
                    REJECT
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}

        {(!requests || requests?.length === 0) && (
          <div className="glass-card text-center py-24">
            <span className="material-symbols-outlined text-white/10 text-6xl block mb-4">check_circle</span>
            <p className="text-white/20 font-black uppercase tracking-widest italic">All clear! No pending approvals.</p>
          </div>
        )}
      </div>
    </div>
  );
}
