'use client';

import { useState } from 'react';
import Link from 'next/link';
import SlotManagementClient from '@/components/SlotManagementClient';

type Slot = { id: number; time_slot: string; price: number };
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

type FreeBooking = {
  id: number;
  booking_date: string;
  time_slot: string;
  number_of_rounds: number;
  status: string;
  rejection_reason: string | null;
};

// Common time slots (generated 6:00 - 23:00 in 1-hour increments)
function generateTimeSlots() {
  const slots = [];
  for (let h = 6; h < 23; h++) {
    const start = `${String(h).padStart(2, '0')}:00`;
    const end = `${String(h + 1).padStart(2, '0')}:00`;
    slots.push(`${start}-${end}`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

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
    slot_template_update: 'Slot Pricing',
    entry_mode_update: 'Entry Mode',
    FREE_BOOKING_REQUEST: 'Free Booking',
    timing_update: 'Timings',
    ARENA_UPDATE: 'Arena Info',
    BLOCK_SLOT_REQUEST: 'Slot Block',
    image_update: 'Images',
    slot_add: 'Add Slot',
    slot_edit: 'Edit Slot',
    slot_delete: 'Delete Slot',
    holiday_add: 'Add Holiday',
    holiday_delete: 'Delete Holiday',
  };
  return <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{labels[type] ?? type.replace(/_/g, ' ')}</span>;
}

function RequestDetail({ request }: { request: ApprovalRequest }) {
  const payload = parsePayload(request.payload_json);
  let detail = '';
  if (request.request_type === 'FREE_BOOKING_REQUEST') {
    detail = `${payload.bookingDate ?? ''} — ${Array.isArray(payload.slots) ? (payload.slots as string[]).join(', ') : ''}`;
  } else if (request.request_type === 'slot_template_update') {
    const slots = Array.isArray(payload.slots) ? payload.slots as any[] : [];
    detail = slots.map((s: any) => `${s.time_slot} @ ₹${s.price}`).join(', ');
  } else if (request.request_type === 'entry_mode_update') {
    detail = `Mode: ${payload.mode ?? ''}`;
  } else if (request.request_type === 'timing_update') {
    detail = `${payload.time_slot ?? ''} ${payload.start_time ?? ''}-${payload.end_time ?? ''}`;
  } else if (request.request_type === 'BLOCK_SLOT_REQUEST') {
    const slots = Array.isArray(payload.slots) ? (payload.slots as string[]).join(', ') : '';
    detail = `${payload.bookingDate ?? ''} — ${slots}`;
  } else if (request.request_type === 'slot_add') {
    detail = `${payload.time_slot ?? ''} @ ₹${payload.price ?? ''}${payload.day_of_week != null ? ` (day ${payload.day_of_week})` : ' (every day)'}`;
  } else if (request.request_type === 'slot_edit') {
    detail = `Slot #${payload.slot_id ?? ''} → ₹${payload.price ?? ''}${payload.day_of_week != null ? ` (day ${payload.day_of_week})` : ' (every day)'}`;
  } else if (request.request_type === 'slot_delete') {
    detail = `Slot #${payload.slot_id ?? ''}`;
  } else if (request.request_type === 'holiday_add') {
    detail = `${payload.date ?? ''}${payload.reason ? ` — ${payload.reason}` : ''}`;
  } else if (request.request_type === 'holiday_delete') {
    detail = `Holiday #${payload.holiday_id ?? ''}`;
  }
  return detail ? <p className="text-xs text-white/50 italic mt-0.5 truncate max-w-xs">{detail}</p> : null;
}

type Props = {
  arenaId: number;
  arenaName: string;
  slots: Slot[];
  timings: Timing[];
  approvalRequests: ApprovalRequest[];
  freeBookings: FreeBooking[];
  entryMode: string;
};

export default function ArenaAdminSlotsClient({
  arenaId,
  arenaName,
  slots,
  timings,
  approvalRequests,
  freeBookings,
  entryMode,
}: Props) {
  // Entry mode
  const [entryModeVal, setEntryModeVal] = useState(entryMode);
  const [entryNotes, setEntryNotes] = useState('');

  // Timing update dropdowns
  const [timingSlot, setTimingSlot] = useState('');
  const [timingDay, setTimingDay] = useState('');
  const [timingStart, setTimingStart] = useState('');
  const [timingEnd, setTimingEnd] = useState('');
  const [timingNotes, setTimingNotes] = useState('');

  // Free booking
  const [fbDate, setFbDate] = useState('');
  const [fbSlots, setFbSlots] = useState<string[]>([]);
  const [fbReason, setFbReason] = useState('');
  const [fbMsg, setFbMsg] = useState('');
  const [fbSubmitting, setFbSubmitting] = useState(false);

  const toggleFbSlot = (slot: string) => {
    setFbSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleFbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbDate || fbSlots.length === 0) return;
    setFbSubmitting(true);
    setFbMsg('');
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/fg-admin/arena/bookings/request-approval';
      [
        ['date', fbDate],
        ['time_slot', fbSlots.join(',')],
        ['number_of_rounds', String(fbSlots.length)],
        ['reason', fbReason],
      ].forEach(([name, value]) => {
        const input = document.createElement('input');
        input.name = name; input.value = value; form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch {
      setFbMsg('Error. Please try again.');
      setFbSubmitting(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
            Slot <span className="text-primary text-stroke">Management</span>
          </h1>
          <p className="label-classic !ml-0">Submit operational changes and request approvals for {arenaName}</p>
        </div>
        <Link href="/fg-admin/arena/dashboard" className="btn-secondary !py-2 !px-4 !rounded-xl text-[10px]">
          ← DASHBOARD
        </Link>
      </div>

      {/* Slots, holidays, and blocked-slot requests — same component the
          super admin page uses, backend already branches direct-apply vs
          approval-request based on role. */}
      <SlotManagementClient arenaId={arenaId} isSuperAdmin={false} />

      {/* Entry Mode */}
      <form action="/api/fg-admin/platform/slots" method="POST" className="glass-card space-y-6 max-w-xl">
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

      {/* Row 2: Timings + Free Booking */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Timing Update */}
        <form action="/api/fg-admin/platform/slots" method="POST" className="glass-card space-y-5">
          <input type="hidden" name="action" value="timing_update" />
          <input type="hidden" name="arena_id" value={arenaId} />
          <div>
            <h2 className="text-2xl font-black uppercase italic">Request Timing Update</h2>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
              Add or update operating hour periods for specific days.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label-classic">Slot Label</label>
              <select name="time_slot" className="input-field !min-h-0 !py-3" required>
                <option value="">— Select Slot —</option>
                {TIME_SLOTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-classic">Day of Week</label>
              <select name="day_of_week" className="input-field !min-h-0 !py-3">
                {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label-classic">Start Time</label>
              <input name="start_time" type="time" className="input-field !min-h-0 !py-3" required />
            </div>
            <div className="space-y-2">
              <label className="label-classic">End Time</label>
              <input name="end_time" type="time" className="input-field !min-h-0 !py-3" required />
            </div>
          </div>
          <textarea name="notes" rows={2} className="input-field" placeholder="Notes / Reason" required />
          <button className="btn-primary w-full" type="submit">Submit Timing Request</button>
        </form>

        {/* Free Booking Request — date + slot multi-select */}
        <form onSubmit={handleFbSubmit} className="glass-card space-y-5">
          <div>
            <h2 className="text-2xl font-black uppercase italic">Request Free Booking</h2>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
              Book slots for VIP, coaching, or maintenance events without fee charges.
            </p>
          </div>
          <div className="space-y-2">
            <label className="label-classic">Date</label>
            <input
              type="date"
              className="input-field !min-h-0 !py-3"
              min={today}
              value={fbDate}
              onChange={(e) => setFbDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="label-classic">Select Time Slots <span className="text-white/30 normal-case">(tap to select multiple)</span></label>
            <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {TIME_SLOTS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleFbSlot(s)}
                  className={`px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    fbSlots.includes(s)
                      ? 'bg-primary text-black border-primary'
                      : 'border-white/10 text-white/50 hover:border-white/30'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {fbSlots.length > 0 && (
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
                Selected: {fbSlots.join(', ')}
              </p>
            )}
          </div>
          <textarea
            className="input-field"
            rows={2}
            placeholder="Event details / Reason"
            value={fbReason}
            onChange={(e) => setFbReason(e.target.value)}
            required
          />
          {fbMsg && <p className="text-red-400 text-xs font-bold">{fbMsg}</p>}
          <button
            className="btn-primary w-full"
            type="submit"
            disabled={fbSubmitting || fbSlots.length === 0 || !fbDate}
          >
            {fbSubmitting ? 'SUBMITTING...' : 'SUBMIT FREE BOOKING REQUEST'}
          </button>
        </form>
      </div>

      {/* Operating Hours (display only — out of scope for this pass) */}
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
      <div className="grid lg:grid-cols-2 gap-8">
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

        <div className="glass-card">
          <h2 className="text-2xl font-black uppercase italic mb-6">Free Booking Requests</h2>
          {freeBookings.length === 0 ? (
            <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No recent free booking requests.</p>
          ) : (
            <div className="space-y-3">
              {freeBookings.map((fb) => (
                <div key={fb.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between items-start gap-4">
                  <div>
                    <span className="font-bold text-white block text-sm">{fb.booking_date}</span>
                    <span className="text-xs text-white/60">{fb.time_slot}</span>
                    {fb.rejection_reason && (
                      <p className="text-xs text-red-400 mt-1 italic">Rejected: "{fb.rejection_reason}"</p>
                    )}
                  </div>
                  <span className={`pill-status uppercase tracking-widest text-[9px] shrink-0 ${statusClass(fb.status)}`}>
                    {fb.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
