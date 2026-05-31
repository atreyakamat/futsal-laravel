'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Slot = {
  time_slot: string;
  price: number | string;
  status: 'available' | 'booked' | 'locked' | 'selected';
};

export default function BookingSystem({ arenaId, initialDate }: { arenaId: number; initialDate: string }) {
  // 1. All State declarations at the top
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  // 2. Fetch Slots Logic
  const fetchSlots = useCallback(async () => {
    try {
      const response = await fetch(`/api/slots/status?arena_id=${arenaId}&date=${date}`);
      if (!response.ok) throw new Error('Failed to fetch slot status');
      
      const data = await response.json();
      const newSlots = data.slots || [];
      setSlots(newSlots);
      setRetryCount(0);
      setError(null);

      // Sync selected slots with latest availability
      setSelectedSlots((prev) =>
        prev.filter((ps) =>
          newSlots.some(
            (s: Slot) => s.time_slot === ps.time_slot && (s.status === 'available' || s.status === 'selected')
          )
        )
      );
    } catch (e) {
      console.error('Fetch slots error:', e);
      setRetryCount(prev => prev + 1);
      setError('Connection lost. Retrying...');
    } finally {
      setLoading(false);
    }
  }, [arenaId, date]);

  // 3. Effects
  useEffect(() => {
    setLoading(true);
    fetchSlots();
    const interval = setInterval(fetchSlots, 30000);
    return () => clearInterval(interval);
  }, [fetchSlots]);

  useEffect(() => {
    if (retryCount > 0 && retryCount < 5) {
      const timer = setTimeout(fetchSlots, 2000 * retryCount);
      return () => clearTimeout(timer);
    }
  }, [retryCount, fetchSlots]);

  // 4. Actions
  async function toggleSlot(slot: Slot) {
    const isSelected = selectedSlots.some((s) => s.time_slot === slot.time_slot);

    try {
      if (isSelected) {
        await fetch('/api/slots/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ arena_id: arenaId, date, slots: [slot.time_slot] }),
        });
        setSelectedSlots(prev => prev.filter((s) => s.time_slot !== slot.time_slot));
      } else {
        const response = await fetch('/api/slots/lock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ arena_id: arenaId, date, slots: [slot.time_slot] }),
        });
        
        if (!response.ok) throw new Error('Lock failed');
        const data = await response.json();

        if (data.success) {
          setSelectedSlots(prev => [...prev, slot]);
        } else {
          alert('This slot was just taken. Refreshing...');
          fetchSlots();
        }
      }
    } catch (e) {
      console.error('Toggle slot error:', e);
      alert('Action failed. Please try again.');
    }
  }

  async function handleProceed() {
    if (selectedSlots?.length === 0) return;
    setProcessing(true);
    const slotsArr = selectedSlots.map((s) => s.time_slot);

    try {
      const response = await fetch('/api/slots/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arena_id: arenaId, date, slots: slotsArr }),
      });

      if (!response.ok) throw new Error('Final lock failed');
      const data = await response.json();
      
      if (data.success) {
        router.push(`/booking/checkout?arena_id=${arenaId}&date=${date}&slots=${encodeURIComponent(JSON.stringify(slotsArr))}`);
      } else {
        alert('Some selected slots were just taken. Refreshing...');
        fetchSlots();
      }
    } catch (e) {
      console.error('Proceed error:', e);
      alert('Error securing slots. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  // 5. Derived data
  const total = (selectedSlots || []).reduce((sum, s) => {
    if (!s || s.price == null) return sum;
    const priceStr = String(s.price).replace(/[^0-9.]/g, '');
    const price = Number(priceStr);
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  return (
    <section className="py-20 max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          {/* Date Picker */}
          <div>
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4 italic">
                <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <span className="material-symbols-outlined text-xl">calendar_month</span>
                </span>
                1. Choose <span className="text-primary text-stroke">Date</span>
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-8 -mx-4 px-4 no-scrollbar">
              {dates.map((d) => {
                const dateObj = new Date(d);
                const isActive = d === date;
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setDate(d);
                      setSelectedSlots([]);
                    }}
                    className={`date-card flex-shrink-0 flex flex-col items-center justify-center w-24 h-28 rounded-[1.5rem] border glass transition-all duration-300 ${
                      isActive ? 'bg-primary text-black border-primary -translate-y-2 shadow-[0_10px_30px_rgba(13,242,32,0.3)]' : 'border-white/5 hover:border-primary/30'
                    }`}
                  >
                    <span className={`text-[10px] font-black uppercase mb-1 tracking-widest ${isActive ? 'text-black/60' : 'text-white/40'}`}>
                      {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-3xl font-black mb-1 leading-none">{dateObj.getDate()}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-black/60' : 'text-white/40'}`}>
                      {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots Grid */}
          <div>
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4 italic">
                <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <span className="material-symbols-outlined text-xl">schedule</span>
                </span>
                2. Pick <span className="text-primary text-stroke">Slots</span>
              </h2>
              <div className="flex gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(13,242,32,0.5)]" /> Available
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10" /> Taken
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center glass-card border-dashed border-white/5">
                <div className="w-14 h-14 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-6" />
                <span className="label-classic">Syncing with real-time locks...</span>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-widest text-center">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {(slots || []).map((slot) => {
                    const isSelected = selectedSlots.some((s) => s.time_slot === slot.time_slot);
                    const isBooked = slot.status === 'booked';
                    const isLocked = slot.status === 'locked';

                    return (
                      <button
                        key={slot.time_slot}
                        onClick={() => toggleSlot(slot)}
                        disabled={isBooked || isLocked}
                        className={`slot-card p-8 rounded-3xl border border-white/5 glass text-center transition-all duration-300 group relative overflow-hidden ${
                          isBooked ? 'opacity-20 grayscale cursor-not-allowed bg-white/[0.02]' : ''
                        } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''} ${
                          isSelected ? 'border-primary bg-primary/5 text-primary shadow-[0_0_30px_rgba(13,242,32,0.1)] scale-105' : 'hover:border-primary/50 hover:scale-[1.02]'
                        }`}
                      >
                        <div className="text-xl font-black tracking-tight mb-2 uppercase italic">{slot.time_slot}</div>
                        <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${isSelected ? 'text-primary' : 'text-white/40'}`}>
                          {slot.status === 'available' || isSelected ? `₹${slot.price}` : slot.status}
                        </div>
                        {isSelected && (
                          <div className="absolute top-3 right-3 text-primary animate-pulse">
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {(slots?.length || 0) === 0 && (
                  <div className="py-24 text-center glass-card border-dashed border-white/5">
                    <p className="label-classic">No slots configured for this date.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-4">
          <div className="glass-card sticky top-28 !p-10">
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-10 italic">
              Booking <span className="text-primary text-stroke">Summary</span>
            </h3>

            <div className="space-y-8 mb-10">
              <div className="flex justify-between items-center label-classic">
                <span>Selected Slots</span>
                <span className="text-white font-black text-lg italic">{selectedSlots?.length || 0}</span>
              </div>

              <div className="space-y-4 max-h-60 overflow-y-auto pr-3 no-scrollbar">
                {(selectedSlots?.length || 0) === 0 ? (
                  <div className="py-12 text-center glass rounded-3xl border-dashed border-white/5">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Select your time slots</p>
                  </div>
                ) : (
                  selectedSlots.map((s) => (
                    <div
                      key={s.time_slot}
                      className="flex justify-between items-center p-5 rounded-2xl bg-white/[0.03] border border-white/5 transition-all hover:border-white/10"
                    >
                      <div>
                        <div className="font-black text-lg uppercase italic">{s.time_slot}</div>
                        <div className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">
                          {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' })}
                        </div>
                      </div>
                      <div className="text-primary font-black text-lg">₹{s.price}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 space-y-6">
              <div className="flex justify-between items-end">
                <span className="label-classic">Total Amount</span>
                <span className="text-4xl font-black text-white italic tracking-tighter">₹{total}</span>
              </div>

              <button
                onClick={handleProceed}
                disabled={(selectedSlots?.length || 0) === 0 || processing}
                className="btn-primary w-full py-6 flex items-center justify-center gap-3 scale-105"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    LOCKING...
                  </>
                ) : (
                  (selectedSlots?.length || 0) > 0 ? (
                    <>
                      PROCEED TO CHECKOUT
                      <span className="material-symbols-outlined font-black">arrow_forward</span>
                    </>
                  ) : 'PICK SLOTS TO START'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
