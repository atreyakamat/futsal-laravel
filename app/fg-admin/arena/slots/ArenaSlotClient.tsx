'use client';

import { useState } from 'react';
import Link from 'next/link';

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
  // Slot template — multi-row dropdown form
  const [slotRows, setSlotRows] = useState<{ time_slot: string; price: string }[]>([
    { time_slot: '', price: '' },
  ]);
  const [slotNotes, setSlotNotes] = useState('');
  const [slotSubmitting, setSlotSubmitting] = useState(false);
  const [slotMsg, setSlotMsg] = useState('');

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

  // Block slot
  const [blockDate, setBlockDate] = useState('');
  const [blockSlot, setBlockSlot] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const addSlotRow = () => setSlotRows((prev) => [...prev, { time_slot: '', price: '' }]);
  const removeSlotRow = (i: number) => setSlotRows((prev) => prev.filter((_, idx) => idx !== i));
  const updateSlotRow = (i: number, field: 'time_slot' | 'price', value: string) => {
    setSlotRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const handleSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlotSubmitting(true);
    setSlotMsg('');
    try {
      const parsedSlots = slotRows.map((r) => ({ time_slot: r.time_slot, price: Number(r.price) }));
      const res = await fetch('/api/fg-admin/platform/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'slot_template', arena_id: arenaId, slots, slots_text: '', _slots: parsedSlots, notes: slotNotes, slotRows: parsedSlots }),
      });
      // Use form submit approach so it redirects properly
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/fg-admin/platform/slots';
      const slotsText = slotRows.map((r) => `${r.time_slot},${r.price}`).join('\n');
      [
        ['action', 'slot_template'],
        ['arena_id', String(arenaId)],
        ['slots_text', slotsText],
        ['notes', slotNotes],
      ].forEach(([name, value]) => {
        const input = document.createElement('input');
        input.name = name; input.value = value; form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch {
      setSlotMsg('Error submitting. Please try again.');
      setSlotSubmitting(false);
    }
  };

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

      {/* Row 1: Slot Template + Entry Mode */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Slot Template — Dropdown rows */}
        <form onSubmit={handleSlotSubmit} className="glass-card space-y-5">
          <div>
            <h2 className="text-2xl font-black uppercase italic">Request Slot Template Change</h2>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
              Select time slots and set price per slot. Current slots are replaced if approved.
            </p>
          </div>

          <div className="space-y-3">
            {slotRows.map((row, i) => (
              <div key={i} className="flex gap-3 items-center">
                <select
                  className="input-field flex-1 !min-h-0 !py-3"
                  value={row.time_slot}
                  onChange={(e) => updateSlotRow(i, 'time_slot', e.target.value)}
                  required
                >
                  <option value="">— Select Slot —</option>
                  {TIME_SLOTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    className="input-field !min-h-0 !py-3 !pl-7 w-28"
                    placeholder="Price"
                    value={row.price}
                    onChange={(e) => updateSlotRow(i, 'price', e.target.value)}
                    min={0}
                    required
                  />
                </div>
                {slotRows.length > 1 && (
                  <button type="button" onClick={() => removeSlotRow(i)} className="text-red-400 hover:text-red-300 transition-colors">
                    <span className="material-symbols-outlined text-xl">remove_circle</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={addSlotRow} className="w-full py-2.5 rounded-xl border border-white/10 text-white/50 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">add</span>
            ADD SLOT
          </button>

          <textarea name="notes" rows={2} className="input-field" placeholder="Why is this slot template being changed?" required value={slotNotes} onChange={(e) => setSlotNotes(e.target.value)} />

          {slotMsg && <p className="text-red-400 text-xs font-bold">{slotMsg}</p>}
          <button className="btn-primary w-full" type="submit" disabled={slotSubmitting}>
            {slotSubmitting ? 'SUBMITTING...' : 'SUBMIT SLOT TEMPLATE REQUEST'}
          </button>
        </form>

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
      </div>

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

      {/* Row 3: Block Slot */}
      <div className="grid lg:grid-cols-2 gap-8">
        <form action="/api/fg-admin/arena/requests" method="POST" className="glass-card space-y-5">
          <input type="hidden" name="request_type" value="BLOCK_SLOT_REQUEST" />
          <div>
            <h2 className="text-2xl font-black uppercase italic">Request Slot Block</h2>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
              Block a specific slot from being booked by customers.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label-classic">Date</label>
              <input name="payload[bookingDate]" type="date" className="input-field !min-h-0 !py-3" min={today} required />
            </div>
            <div className="space-y-2">
              <label className="label-classic">Time Slot</label>
              <select name="payload[slots][]" className="input-field !min-h-0 !py-3" required>
                <option value="">— Select Slot —</option>
                {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <textarea name="reason" rows={2} className="input-field" placeholder="Reason for blocking" required />
          <button className="btn-primary w-full" type="submit">Submit Block Request</button>
        </form>

        {/* Current Config */}
        <div className="space-y-6">
          <div className="glass-card">
            <h2 className="text-xl font-black uppercase italic mb-4">Active Pricing & Slots</h2>
            {slots.length === 0 ? (
              <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No slots configured.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {slots.map((s) => (
                  <div key={s.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Slot</div>
                    <div className="font-black text-white italic text-sm">{s.time_slot}</div>
                    <div className="font-black text-primary mt-1">₹{Number(s.price)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
