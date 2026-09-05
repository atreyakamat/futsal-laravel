'use client';

import { useState, useEffect, useCallback } from 'react';

// Hourly marks only (00:00..24:00) — matches the whole-hour slot
// granularity every other part of the app already assumes.
const HOURS = Array.from({ length: 25 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

type BlockRow = { id: number; booking_date: string; time_slot: string; reason: string | null };

interface Props {
  arenaId: number;
}

// Manager-scoped slot blocking — for marking the ground unusable (maintenance
// etc.) on a specific day, or a specific slot range across several days,
// including dates beyond the normal customer booking window. Same underlying
// endpoint as SlotManagementClient (super admin's full slots/pricing tool),
// but deliberately only exposes block_add/block_delete, mirroring
// ManagerHolidayClient's pattern for holidays. Requests need super admin/
// arena admin approval (see MANAGER_ALLOWED_ACTIONS in
// app/api/fg-admin/platform/slots/route.ts); removing an existing block does
// not, since it only ever lifts a restriction.
export default function ManagerBlockClient({ arenaId }: Props) {
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fromHour, setFromHour] = useState('18:00');
  const [toHour, setToHour] = useState('19:00');
  const [reason, setReason] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/fg-admin/platform/slots?arena_id=${arenaId}`);
      const data = await res.json();
      if (data.success) {
        setBlocks(data.blockedSlots || []);
        setError('');
      } else {
        setError(data.message || 'Failed to load blocked slots.');
      }
    } catch {
      setError('Failed to load blocked slots. Please refresh the page.');
    }
  }, [arenaId]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const post = async (payload: Record<string, unknown>) => {
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/fg-admin/platform/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arena_id: arenaId, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(payload.action === 'block_add' ? 'Request submitted for approval.' : 'Slot unblocked.');
        await refresh();
        return true;
      }
      setError(data.message || 'Something went wrong.');
      return false;
    } catch {
      setError('Network error.');
      return false;
    }
  };

  const fromIdx = HOURS.indexOf(fromHour);
  const toIdx = HOURS.indexOf(toHour);
  const validRange = fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx;

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validRange) {
      setError('End time must be after start time.');
      return;
    }
    const ok = await post({
      action: 'block_add',
      booking_date: startDate,
      end_date: endDate || startDate,
      from_hour: fromHour,
      to_hour: toHour,
      reason: reason || 'Blocked',
    });
    if (ok) {
      setStartDate('');
      setEndDate('');
      setReason('');
    }
  };

  const handleUnblock = async (blockId: number) => {
    if (!confirm('Unblock this slot?')) return;
    await post({ action: 'block_delete', block_id: blockId });
  };

  return (
    <div className="glass-card space-y-4 max-w-xl">
      <div>
        <h2 className="text-2xl font-black uppercase italic">Block Slots</h2>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
          Mark slots unusable for maintenance etc. Leave End Date blank for a single day, or set it to block the
          same slot(s) across a range of days — even beyond the normal booking window. Requests need super
          admin/arena admin approval.
        </p>
      </div>

      <form onSubmit={handleAddBlock} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Start Date</label>
            <input required type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/30">End Date (optional)</label>
            <input type="date" className="input-field" min={startDate || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select required className="input-field" value={fromHour} onChange={(e) => setFromHour(e.target.value)}>
            {HOURS.slice(0, -1).map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <select required className="input-field" value={toHour} onChange={(e) => setToHour(e.target.value)}>
            {HOURS.slice(1).map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <input className="input-field" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        {!validRange && <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">End time must be after start time.</p>}
        <button type="submit" className="btn-primary w-full">Request Block</button>
      </form>

      {message && <p className="text-primary text-xs font-bold">{message}</p>}
      {error && <p className="text-red-400 text-xs font-bold">{error}</p>}

      <div className="space-y-2 pt-2">
        {loading ? (
          <p className="text-white/20 text-xs font-bold uppercase tracking-widest">Loading…</p>
        ) : blocks.length === 0 ? (
          <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No upcoming blocked slots.</p>
        ) : (
          blocks.map((b) => (
            <div key={b.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2">
              <div>
                <div className="font-black text-white text-sm">{b.booking_date} · {b.time_slot}</div>
                {b.reason && <div className="text-[10px] text-white/40">{b.reason}</div>}
              </div>
              <button onClick={() => handleUnblock(b.id)} className="text-[9px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400 shrink-0">Unblock</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
