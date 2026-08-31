'use client';

import { useState, useEffect, useCallback } from 'react';

type HolidayRow = { id: number; date: string; reason: string | null };

interface Props {
  arenaId: number;
}

// Manager-scoped holiday management — same underlying endpoint as
// SlotManagementClient (super admin's full slots/pricing/blocking tool),
// but deliberately only exposes holiday_add/holiday_delete: Manager may
// request entry-mode changes and holidays, never pricing/slot structure
// (see app/api/fg-admin/platform/slots/route.ts's manager action allowlist).
export default function ManagerHolidayClient({ arenaId }: Props) {
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayReason, setHolidayReason] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/fg-admin/platform/slots?arena_id=${arenaId}`);
      const data = await res.json();
      if (data.success) {
        setHolidays(data.holidays || []);
        setError('');
      } else {
        setError(data.message || 'Failed to load holidays.');
      }
    } catch {
      setError('Failed to load holidays. Please refresh the page.');
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
        setMessage('Request submitted for approval.');
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

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await post({ action: 'holiday_add', date: holidayDate, reason: holidayReason, notes: holidayReason || 'Add holiday' });
    if (ok) {
      setHolidayDate('');
      setHolidayReason('');
    }
  };

  const handleDeleteHoliday = async (holidayId: number) => {
    if (!confirm('Request removal of this holiday?')) return;
    await post({ action: 'holiday_delete', holiday_id: holidayId, notes: `Delete holiday #${holidayId}` });
  };

  return (
    <div className="glass-card space-y-4 max-w-xl">
      <div>
        <h2 className="text-2xl font-black uppercase italic">Holidays</h2>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
          A holiday closes the entire day for this turf — no slots bookable. Requests need super admin/arena admin approval.
        </p>
      </div>

      <form onSubmit={handleAddHoliday} className="space-y-3">
        <input required type="date" className="input-field" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
        <input className="input-field" placeholder="Reason (optional)" value={holidayReason} onChange={(e) => setHolidayReason(e.target.value)} />
        <button type="submit" className="btn-primary w-full">Request Holiday</button>
      </form>

      {message && <p className="text-primary text-xs font-bold">{message}</p>}
      {error && <p className="text-red-400 text-xs font-bold">{error}</p>}

      <div className="space-y-2 pt-2">
        {loading ? (
          <p className="text-white/20 text-xs font-bold uppercase tracking-widest">Loading…</p>
        ) : holidays.length === 0 ? (
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
  );
}
