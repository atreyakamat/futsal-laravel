'use client';

import { useState } from 'react';

interface RescheduleBookingBtnProps {
  bookingRef: string;
  currentDate: string;
  currentSlot: string;
  paymentStatus: string;
}

export default function RescheduleBookingBtn({
  bookingRef,
  currentDate,
  currentSlot,
  paymentStatus,
}: RescheduleBookingBtnProps) {
  const [open, setOpen] = useState(false);
  const [newDate, setNewDate] = useState(currentDate);
  const [newSlot, setNewSlot] = useState(currentSlot);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (paymentStatus === 'cancelled') return null;

  const handleReschedule = async () => {
    if (!newDate || !newSlot) {
      setError('Please enter a valid date and time slot.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/fg-admin/arena/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef, newDate, newSlot }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        setTimeout(() => {
          setOpen(false);
          window.location.reload();
        }, 1500);
      } else {
        setError(data.message || 'Reschedule failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary !py-2 !px-3 !rounded-xl text-[10px] flex items-center gap-2 border-blue-500/30 text-blue-400 hover:text-blue-300 mt-2"
      >
        <span className="material-symbols-outlined text-sm">event_repeat</span>
        RESCHEDULE
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card !p-10 max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tighter italic">
                Reschedule <span className="text-primary">Booking</span>
              </h2>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="text-xs text-white/40 font-bold uppercase tracking-widest border border-white/5 rounded-xl p-4 space-y-1">
              <p>Ref: <span className="text-primary">{bookingRef}</span></p>
              <p>Current: <span className="text-white">{currentDate} · {currentSlot}</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-classic !ml-0 block mb-2">New Date</label>
                <input
                  type="date"
                  value={newDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="label-classic !ml-0 block mb-2">New Time Slot <span className="text-white/30">(e.g. 08:00 - 09:00)</span></label>
                <input
                  type="text"
                  value={newSlot}
                  placeholder="08:00 - 09:00"
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold">
                {error}
              </div>
            )}
            {message && (
              <div className="px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-bold">
                {message}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setOpen(false)}
                className="btn-secondary flex-1 !py-3"
                disabled={loading}
              >
                CANCEL
              </button>
              <button
                onClick={handleReschedule}
                disabled={loading}
                className="btn-primary flex-1 !py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">check</span>
                )}
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
