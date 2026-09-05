'use client';

import Link from 'next/link';
import ManagerHolidayClient from '@/components/ManagerHolidayClient';
import ManagerBlockClient from '@/components/ManagerBlockClient';

type Timing = { id: number; time_slot: string; start_time: string; end_time: string; day_of_week: number | null };
type ApprovalRequest = {
  id: number;
  request_type: string;
  arena_id: number | null;
  requested_by: number | null;
  status: string;
  notes: string | null;
  payload_json: string | null;
  created_at: string;
};

const DAYS = [
  { value: '', label: 'All Days' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
];

function getDayName(day: number | null) {
  if (day === null) return 'All Days';
  return DAYS.find((d) => d.value === String(day))?.label ?? 'Unknown';
}

function statusClass(status: string) {
  if (status === 'approved') return 'border-primary/20 text-primary';
  if (status === 'rejected') return 'border-red-500/20 text-red-400';
  return 'border-yellow-500/20 text-yellow-500';
}

function parsePayload(json: string | null): Record<string, unknown> {
  try { return json ? JSON.parse(json) : {}; } catch { return {}; }
}

function RequestTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    entry_mode_update: 'Entry Mode',
    holiday_add: 'Add Holiday',
    holiday_delete: 'Delete Holiday',
    admin_free_booking: 'Free / Discounted Booking',
    FREE_BOOKING_REQUEST: 'Free Booking',
    BLOCK_SLOT_REQUEST: 'Block Slots',
  };
  return <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{labels[type] ?? type.replace(/_/g, ' ')}</span>;
}

function RequestDetail({ request }: { request: ApprovalRequest }) {
  const payload = parsePayload(request.payload_json);
  let detail = '';
  if (request.request_type === 'entry_mode_update') {
    detail = `Mode: ${payload.mode ?? ''}`;
  } else if (request.request_type === 'holiday_add') {
    detail = `${payload.date ?? ''}${payload.reason ? ` — ${payload.reason}` : ''}`;
  } else if (request.request_type === 'holiday_delete') {
    detail = `Holiday #${payload.holiday_id ?? ''}`;
  } else if (request.request_type === 'admin_free_booking' || request.request_type === 'FREE_BOOKING_REQUEST') {
    const slots = Array.isArray(payload.slots) ? (payload.slots as string[]).join(', ') : '';
    const price = typeof payload.discountedSlotPrice === 'number' ? ` — ₹${payload.discountedSlotPrice}/slot` : ' — Free';
    detail = `${payload.bookingDate ?? ''} — ${slots}${price}`;
  } else if (request.request_type === 'BLOCK_SLOT_REQUEST') {
    const dates = Array.isArray(payload.dates) ? (payload.dates as string[]) : [];
    const slots = Array.isArray(payload.slots) ? (payload.slots as string[]).join(', ') : '';
    const dateLabel = dates.length > 1 ? `${dates[0]} → ${dates[dates.length - 1]}` : (dates[0] ?? '');
    detail = `${dateLabel} — ${slots}${payload.reason ? ` — ${payload.reason}` : ''}`;
  }
  return detail ? <p className="text-xs text-white/50 italic mt-0.5 truncate max-w-xs">{detail}</p> : null;
}

type Props = {
  arenaId: number;
  arenaName: string;
  timings: Timing[];
  approvalRequests: ApprovalRequest[];
  entryMode: string;
};

export default function ArenaAdminSlotsClient({
  arenaId,
  arenaName,
  timings,
  approvalRequests,
  entryMode,
}: Props) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
            Slot <span className="text-primary text-stroke">Management</span>
          </h1>
          <p className="label-classic !ml-0">Manage entry mode, holidays, and booking requests for {arenaName}</p>
        </div>
        <Link href="/fg-admin/arena/dashboard" className="btn-secondary !py-2 !px-4 !rounded-xl text-[10px]">
          ← DASHBOARD
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Entry Mode */}
        <form action="/api/fg-admin/platform/slots" method="POST" className="glass-card space-y-6">
          <input type="hidden" name="action" value="entry_mode" />
          <input type="hidden" name="arena_id" value={arenaId} />
          <div>
            <h2 className="text-2xl font-black uppercase italic">Request Entry Mode Change</h2>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
              Open (public bookings) · Blocked (no entry) · Free Entry (no fees)
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Current Mode</span>
            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
              entryMode === 'open' ? 'text-primary border-primary/30 bg-primary/10' :
              entryMode === 'blocked' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
              'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
            }`}>{entryMode}</span>
          </div>
          <select name="mode" className="input-field" defaultValue={entryMode}>
            <option value="open">Open — Public Bookings</option>
            <option value="blocked">Blocked — Turf Shutdown</option>
            <option value="free">Free Entry — No Fees</option>
          </select>
          <textarea name="notes" rows={3} className="input-field" placeholder="Reason for changing turf entry mode?" required />
          <button className="btn-primary w-full" type="submit">Submit Entry Mode Request</button>
        </form>

        {/* Holidays */}
        <ManagerHolidayClient arenaId={arenaId} />
      </div>

      {/* Block Slots — ground unusable for maintenance etc., a single day
          or a slot range across several days, including beyond the normal
          booking window. */}
      <ManagerBlockClient arenaId={arenaId} />

      {/* Free / Discounted Booking — customer details, discount, and
          cash/UPI payment capture all live on the shared admin booking
          form; Manager's submission there always requires approval. */}
      <div className="glass-card max-w-xl flex items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black uppercase italic">Free / Discounted Booking</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
            Book a slot for free or at a reduced cash/UPI price — requires super admin/arena admin approval.
          </p>
        </div>
        <Link href="/fg-admin/platform/bookings/create" className="btn-primary !py-3 !px-6 !text-xs shrink-0">
          NEW REQUEST
        </Link>
      </div>

      {/* Operating Hours (display only — Manager cannot request timing changes) */}
      <div className="glass-card max-w-xl">
        <h2 className="text-xl font-black uppercase italic mb-4">Operating Hours</h2>
        {timings.length === 0 ? (
          <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No timings configured.</p>
        ) : (
          <div className="space-y-2">
            {timings.map((t) => (
              <div key={t.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-black text-white italic text-sm">{t.time_slot}</div>
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{getDayName(t.day_of_week)}</div>
                </div>
                <div className="text-primary font-black text-sm">{t.start_time}–{t.end_time}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Requests History */}
      <div className="glass-card">
        <h2 className="text-2xl font-black uppercase italic mb-6">Operational Requests</h2>
        {approvalRequests.length === 0 ? (
          <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No recent requests.</p>
        ) : (
          <div className="space-y-3">
            {approvalRequests.map((ar) => (
              <div key={ar.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <RequestTypeBadge type={ar.request_type} />
                  <RequestDetail request={ar} />
                  <span className="text-[9px] text-white/30 block mt-1">{new Date(ar.created_at).toLocaleString('en-IN')}</span>
                  {ar.notes && <p className="text-[10px] text-white/50 italic mt-0.5">"{ar.notes}"</p>}
                </div>
                <span className={`pill-status uppercase tracking-widest text-[9px] shrink-0 ${statusClass(ar.status)}`}>
                  {ar.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
