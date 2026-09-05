'use client';

import { useState, useEffect, useCallback } from 'react';

const DAY_NAMES: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

// Hourly marks only (00:00..24:00) — slots are always whole-hour blocks,
// this rules out accidentally typing an off-hour or malformed time range.
const HOURS = Array.from({ length: 25 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

/** Splits a From/To range into individual 1-hour slot strings, matching
 * the "18:00-19:00" granularity every other part of the app (booking,
 * availability, pricing lookup) already assumes — a single admin
 * selection like 18:00-21:00 becomes three separate hourly slot rows,
 * not one 3-hour slot the rest of the system wouldn't recognize. */
function splitIntoHourlySlots(fromHour: string, toHour: string): string[] {
  const fromIdx = HOURS.indexOf(fromHour);
  const toIdx = HOURS.indexOf(toHour);
  if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) return [];
  const result: string[] = [];
  for (let h = fromIdx; h < toIdx; h++) {
    result.push(`${HOURS[h]}-${HOURS[h + 1]}`);
  }
  return result;
}

type SlotRow = { id: number; time_slot: string; price: number; day_of_week: number | null };
type HolidayRow = { id: number; date: string; reason: string | null };
type BlockRow = { id: number; booking_date: string; time_slot: string; reason: string | null };

interface Props {
  arenaId: number;
  isSuperAdmin: boolean;
}

export default function SlotManagementClient({ arenaId, isSuperAdmin }: Props) {
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [newFromHour, setNewFromHour] = useState('18:00');
  const [newToHour, setNewToHour] = useState('19:00');
  const [newPrice, setNewPrice] = useState('');
  const [newDayOfWeek, setNewDayOfWeek] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDayOfWeek, setEditDayOfWeek] = useState('');

  const [holidayDate, setHolidayDate] = useState('');
  const [holidayReason, setHolidayReason] = useState('');

  const [blockDate, setBlockDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockFromHour, setBlockFromHour] = useState('18:00');
  const [blockToHour, setBlockToHour] = useState('19:00');
  const [blockReason, setBlockReason] = useState('');

  const applyLabel = isSuperAdmin ? 'Apply' : 'Request';

  const refresh = useCallback(async () => {
    // A failed fetch/parse here used to disappear as an unhandled promise
    // rejection (the caller only ever did `refresh().finally(...)`, which
    // doesn't catch) — an add/edit/delete could succeed server-side while
    // the "Current Slots" list silently never updated to show it, with no
    // visible error at all. Now surfaced through the same `error` state
    // the rest of the UI already reads.
    try {
      const res = await fetch(`/api/fg-admin/platform/slots?arena_id=${arenaId}`);
      const data = await res.json();
      if (data.success) {
        setSlots(data.slots || []);
        setHolidays(data.holidays || []);
        setBlocks(data.blockedSlots || []);
        setError('');
      } else {
        setError(data.message || 'Failed to load slot data.');
      }
    } catch {
      setError('Failed to load slot data. Please refresh the page.');
    }
    setLoaded(true);
  }, [arenaId]);

  useEffect(() => {
    setLoading(true);
    setLoaded(false);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Fires one request, no refresh/message side effects — used directly by
  // callers (like handleAddSlot) that need to fire several in sequence and
  // only refresh/report once at the end.
  const postOnce = async (payload: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/fg-admin/platform/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arena_id: arenaId, ...payload }),
      });
      const data = await res.json();
      return { ok: !!data.success, message: data.message };
    } catch {
      return { ok: false, message: 'Network error.' };
    }
  };

  const post = async (payload: Record<string, unknown>) => {
    setError('');
    setMessage('');
    const result = await postOnce(payload);
    if (result.ok) {
      setMessage(isSuperAdmin ? 'Applied successfully.' : 'Request submitted for approval.');
      await refresh();
      return true;
    }
    setError(result.message || 'Something went wrong.');
    return false;
  };

  const newHourlySlots = splitIntoHourlySlots(newFromHour, newToHour);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newHourlySlots.length === 0) {
      setError('End time must be after start time.');
      return;
    }
    setError('');
    setMessage('');

    const failures: string[] = [];
    for (const timeSlot of newHourlySlots) {
      const result = await postOnce({
        action: 'slot_add',
        time_slot: timeSlot,
        price: Number(newPrice),
        day_of_week: newDayOfWeek === '' ? '' : newDayOfWeek,
        notes: `Add slot ${timeSlot}`,
      });
      if (!result.ok) failures.push(`${timeSlot}: ${result.message || 'failed'}`);
    }

    await refresh();

    if (failures.length === 0) {
      setMessage(
        isSuperAdmin
          ? `Applied — ${newHourlySlots.length} slot${newHourlySlots.length > 1 ? 's' : ''} created.`
          : `Request submitted for approval — ${newHourlySlots.length} slot${newHourlySlots.length > 1 ? 's' : ''}.`
      );
      setNewPrice('');
      setNewDayOfWeek('');
    } else {
      setError(`${failures.length} of ${newHourlySlots.length} slot(s) failed: ${failures.join('; ')}`);
    }
  };

  const startEdit = (slot: SlotRow) => {
    setEditingId(slot.id);
    setEditPrice(String(slot.price));
    setEditDayOfWeek(slot.day_of_week === null ? '' : String(slot.day_of_week));
  };

  const handleSaveEdit = async (slotId: number) => {
    const ok = await post({
      action: 'slot_edit',
      slot_id: slotId,
      price: Number(editPrice),
      day_of_week: editDayOfWeek === '' ? '' : editDayOfWeek,
      notes: `Edit slot #${slotId}`,
    });
    if (ok) setEditingId(null);
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!confirm('Delete this slot?')) return;
    await post({ action: 'slot_delete', slot_id: slotId, notes: `Delete slot #${slotId}` });
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await post({ action: 'holiday_add', date: holidayDate, reason: holidayReason, notes: holidayReason || 'Add holiday' });
    if (ok) {
      setHolidayDate('');
      setHolidayReason('');
    }
  };

  const handleDeleteHoliday = async (holidayId: number) => {
    if (!confirm('Remove this holiday?')) return;
    await post({ action: 'holiday_delete', holiday_id: holidayId, notes: `Delete holiday #${holidayId}` });
  };

  // Display-only preview of the hourly slots one day of this range covers —
  // actual expansion across both the date range and the hour range happens
  // server-side (see block_add in app/api/fg-admin/platform/slots/route.ts),
  // so a multi-day request is still a single submission / approval record.
  const blockHourlySlots = splitIntoHourlySlots(blockFromHour, blockToHour);

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockHourlySlots.length === 0) {
      setError('End time must be after start time.');
      return;
    }
    setError('');
    setMessage('');

    const result = await postOnce({
      action: 'block_add',
      booking_date: blockDate,
      end_date: blockEndDate || blockDate,
      from_hour: blockFromHour,
      to_hour: blockToHour,
      reason: blockReason || 'Blocked',
    });

    await refresh();

    if (result.ok) {
      setMessage(isSuperAdmin ? 'Applied — slots blocked.' : 'Request submitted for approval.');
      setBlockDate('');
      setBlockEndDate('');
      setBlockReason('');
    } else {
      setError(result.message || 'Something went wrong.');
    }
  };

  const handleDeleteBlock = async (blockId: number) => {
    if (!confirm('Unblock this slot?')) return;
    await post({ action: 'block_delete', block_id: blockId });
  };

  // Group slots: "All Days" default rows first, then one group per weekday that has overrides
  const allDaySlots = slots.filter((s) => s.day_of_week === null);
  const perDaySlots = slots.filter((s) => s.day_of_week !== null);
  const dayGroups = Object.entries(DAY_NAMES)
    .map(([dayNum, label]) => ({ day: Number(dayNum), label, rows: perDaySlots.filter((s) => s.day_of_week === Number(dayNum)) }))
    .filter((g) => g.rows.length > 0);

  const slotRow = (slot: SlotRow) => (
    <div key={slot.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
      {editingId === slot.id ? (
        <div className="space-y-2">
          <div className="font-black uppercase italic text-sm">{slot.time_slot}</div>
          <input
            type="number"
            className="input-field !py-2 !text-sm"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            placeholder="Price"
          />
          <select className="input-field !py-2 !text-sm" value={editDayOfWeek} onChange={(e) => setEditDayOfWeek(e.target.value)}>
            <option value="">All Days</option>
            {Object.entries(DAY_NAMES).map(([d, label]) => (
              <option key={d} value={d}>{label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={() => handleSaveEdit(slot.id)} className="btn-primary !py-2 !px-3 !text-[10px] flex-1">SAVE</button>
            <button onClick={() => setEditingId(null)} className="btn-secondary !py-2 !px-3 !text-[10px] flex-1">CANCEL</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-black uppercase italic">{slot.time_slot}</div>
            <div className="text-primary font-black">₹{Number(slot.price)}</div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => startEdit(slot)} className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-primary">Edit</button>
            <button onClick={() => handleDeleteSlot(slot.id)} className="text-[9px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400">Delete</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {error && <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold">{error}</div>}
      {message && <div className="px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-bold">{message}</div>}

      {/* Add Slot */}
      <div className="glass-card space-y-4">
        <h2 className="text-2xl font-black uppercase italic">Add Slot</h2>
        <form onSubmit={handleAddSlot} className="grid md:grid-cols-5 gap-4 items-end">
          <div className="space-y-2">
            <label className="label-classic">From</label>
            <select required className="input-field" value={newFromHour} onChange={(e) => setNewFromHour(e.target.value)}>
              {HOURS.slice(0, -1).map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label-classic">To</label>
            <select required className="input-field" value={newToHour} onChange={(e) => setNewToHour(e.target.value)}>
              {HOURS.slice(1).map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label-classic">Price (₹)</label>
            <input required type="number" min={0} className="input-field" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="label-classic">Day</label>
            <select className="input-field" value={newDayOfWeek} onChange={(e) => setNewDayOfWeek(e.target.value)}>
              <option value="">All Days</option>
              {Object.entries(DAY_NAMES).map(([d, label]) => (
                <option key={d} value={d}>{label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">{applyLabel} Slot</button>
        </form>
        {newHourlySlots.length > 0 ? (
          <div className="px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-bold">
            This creates {newHourlySlots.length} slot{newHourlySlots.length > 1 ? 's' : ''}
            {newPrice ? ` at ₹${newPrice} each` : ''}: {newHourlySlots.join(', ')}
          </div>
        ) : (
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">End time must be after start time.</p>
        )}
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
          Slots are whole-hour blocks — a multi-hour range creates one slot per hour, each at the price entered above. Leave "Day" as All Days for a slot that applies every day. Adding a specific day creates an override for just that weekday (e.g. a different weekend price for the same time range).
        </p>
      </div>

      {/* Current Slots */}
      <div className="glass-card">
        <h2 className="text-2xl font-black uppercase italic mb-6">Current Slots</h2>
        {loading ? (
          <p className="text-white/30 text-xs uppercase font-bold tracking-widest">Loading...</p>
        ) : slots.length === 0 ? (
          <p className="text-white/30 text-xs uppercase font-bold tracking-widest">No slots configured yet.</p>
        ) : (
          <div className="space-y-6">
            {allDaySlots.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">All Days</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{allDaySlots.map(slotRow)}</div>
              </div>
            )}
            {dayGroups.map((g) => (
              <div key={g.day}>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">{g.label} Override</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{g.rows.map(slotRow)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Holidays */}
        <div className="glass-card space-y-4">
          <h2 className="text-2xl font-black uppercase italic">Holidays</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">A holiday closes the entire day for this turf — no slots bookable.</p>
          <form onSubmit={handleAddHoliday} className="space-y-3">
            <input required type="date" className="input-field" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
            <input className="input-field" placeholder="Reason (optional)" value={holidayReason} onChange={(e) => setHolidayReason(e.target.value)} />
            <button type="submit" className="btn-primary w-full">{applyLabel} Holiday</button>
          </form>
          <div className="space-y-2 pt-2">
            {holidays.length === 0 ? (
              <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No holidays configured.</p>
            ) : (
              holidays.map((h) => (
                <div key={h.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-black text-white text-sm">{h.date}</div>
                    {h.reason && <div className="text-[10px] text-white/40">{h.reason}</div>}
                  </div>
                  <button onClick={() => handleDeleteHoliday(h.id)} className="text-[9px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400 shrink-0">Remove</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Blocked Slots */}
        <div className="glass-card space-y-4">
          <h2 className="text-2xl font-black uppercase italic">Blocked Slots</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            {isSuperAdmin ? 'Blocks apply immediately.' : 'Block requests need super admin approval.'} Leave End Date blank to block a single day, or set it to block the same slot(s) across a range of days — for example, a maintenance closure, even beyond the normal booking window.
          </p>
          <form onSubmit={handleAddBlock} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Start Date</label>
                <input required type="date" className="input-field" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30">End Date (optional)</label>
                <input type="date" className="input-field" min={blockDate || undefined} value={blockEndDate} onChange={(e) => setBlockEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select required className="input-field" value={blockFromHour} onChange={(e) => setBlockFromHour(e.target.value)}>
                {HOURS.slice(0, -1).map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <select required className="input-field" value={blockToHour} onChange={(e) => setBlockToHour(e.target.value)}>
                {HOURS.slice(1).map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <input className="input-field" placeholder="Reason (optional)" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
            {blockHourlySlots.length > 0 ? (
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                This blocks {blockHourlySlots.length} slot{blockHourlySlots.length > 1 ? 's' : ''} per day: {blockHourlySlots.join(', ')}
                {blockEndDate && blockEndDate !== blockDate ? ` — from ${blockDate} through ${blockEndDate}` : ''}
              </p>
            ) : (
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">End time must be after start time.</p>
            )}
            <button type="submit" className="btn-primary w-full">{applyLabel} Block</button>
          </form>
          <div className="space-y-2 pt-2">
            {blocks.length === 0 ? (
              <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No upcoming blocked slots.</p>
            ) : (
              blocks.map((b) => (
                <div key={b.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-black text-white text-sm">{b.booking_date} · {b.time_slot}</div>
                    {b.reason && <div className="text-[10px] text-white/40">{b.reason}</div>}
                  </div>
                  <button onClick={() => handleDeleteBlock(b.id)} className="text-[9px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400 shrink-0">Unblock</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
