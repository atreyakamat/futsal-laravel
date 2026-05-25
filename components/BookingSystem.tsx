'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Slot = {
  time_slot: string;
  price: number | string;
  status: 'available' | 'booked' | 'locked' | 'selected';
};

export default function BookingSystem({ arenaId, initialDate }: { arenaId: number; initialDate: string }) {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  const fetchSlots = useCallback(async () => {
    if (slots.length === 0) setLoading(true);
    try {
      const response = await fetch(`/api/slots/status?arena_id=${arenaId}&date=${date}`);
      const data = await response.json();
      setSlots(data.slots);

      // Refresh selected slots based on current status
      setSelectedSlots((prev) =>
        prev.filter((ps) =>
          data.slots.some(
            (s: Slot) => s.time_slot === ps.time_slot && (s.status === 'available' || s.status === 'selected')
          )
        )
      );
    } catch (e) {
      console.error('Failed to fetch slots', e);
    } finally {
      setLoading(false);
    }
  }, [arenaId, date, slots.length]);

  useEffect(() => {
    fetchSlots();
    const interval = setInterval(fetchSlots, 30000);
    return () => clearInterval(interval);
  }, [fetchSlots]);

  async function toggleSlot(slot: Slot) {
    const isSelected = selectedSlots.some((s) => s.time_slot === slot.time_slot);

    if (isSelected) {
      await fetch('/api/slots/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arena_id: arenaId, date, slots: [slot.time_slot] }),
      });
      setSelectedSlots(selectedSlots.filter((s) => s.time_slot !== slot.time_slot));
    } else {
      const response = await fetch('/api/slots/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arena_id: arenaId, date, slots: [slot.time_slot] }),
      });
      const data = await response.json();

      if (data.success) {
        setSelectedSlots([...selectedSlots, slot]);
      } else {
        alert('This slot was just taken. Refreshing...');
        fetchSlots();
      }
    }
  }

  async function handleProceed() {
    setProcessing(true);
    const slotsArr = selectedSlots.map((s) => s.time_slot);

    try {
      const response = await fetch('/api/slots/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arena_id: arenaId, date, slots: slotsArr }),
      });

      const data = await response.json();
      if (data.success) {
        router.push(`/booking/checkout?arena_id=${arenaId}&date=${date}&slots=${JSON.stringify(slotsArr)}`);
      } else {
        alert('Some selected slots were just taken. Refreshing...');
        fetchSlots();
      }
    } catch (e) {
      alert('Error locking slots. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  const total = selectedSlots.reduce((sum, s) => sum + Number(s.price), 0);

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
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">calendar_month</span>
                </span>
                1. Choose Date
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-6 -mx-2 px-2 no-scrollbar">
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
                    className={`date-card flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-2xl border glass transition-all duration-300 ${
                      isActive ? 'bg-primary text-black border-primary -translate-y-1' : 'border-white/5 hover:border-primary/30'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase mb-1 ${isActive ? 'text-black' : 'opacity-60'}`}>
                      {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-2xl font-black mb-1">{dateObj.getDate()}</span>
                    <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-black' : 'opacity-60'}`}>
                      {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots Grid */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">schedule</span>
                </span>
                2. Pick Slots
              </h2>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" /> Available
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/10" /> Taken
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center glass rounded-3xl border-dashed border-white/10">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                <span className="text-xs font-bold tracking-widest text-gray-700 uppercase">Fetching live availability...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {slots.map((slot) => {
                  const isSelected = selectedSlots.some((s) => s.time_slot === slot.time_slot);
                  const isBooked = slot.status === 'booked';
                  const isLocked = slot.status === 'locked';

                  return (
                    <button
                      key={slot.time_slot}
                      onClick={() => toggleSlot(slot)}
                      disabled={isBooked || isLocked}
                      className={`slot-card p-6 rounded-2xl border border-white/5 glass text-center transition-all duration-300 group relative overflow-hidden ${
                        isBooked ? 'opacity-30 grayscale cursor-not-allowed bg-white/5' : ''
                      } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''} ${
                        isSelected ? 'bg-primary/10 border-primary text-primary' : 'hover:border-primary/50 hover:scale-[1.02]'
                      }`}
                    >
                      <div className="text-lg font-black tracking-tight mb-1">{slot.time_slot}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                        {slot.status === 'available' || isSelected ? `₹${slot.price}` : slot.status}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 text-primary">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-4">
          <div className="glass p-8 rounded-[2.5rem] border border-white/10 sticky top-28 shadow-2xl shadow-black/50">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic">
              Booking <span className="text-primary">Summary</span>
            </h3>

            <div className="space-y-6 mb-8">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-600">
                <span>Selected Slots</span>
                <span className="text-white">{selectedSlots.length}</span>
              </div>

              <div className="space-y-3 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                {selectedSlots.length === 0 ? (
                  <div className="py-8 text-center glass rounded-2xl border-dashed border-white/5">
                    <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">No slots selected yet</p>
                  </div>
                ) : (
                  selectedSlots.map((s) => (
                    <div
                      key={s.time_slot}
                      className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5"
                    >
                      <div>
                        <div className="font-bold text-sm">{s.time_slot}</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                          {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' })}
                        </div>
                      </div>
                      <div className="text-primary font-black">₹{s.price}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Total Amount</span>
                <span className="text-3xl font-black text-white italic">₹{total}</span>
              </div>

              <button
                onClick={handleProceed}
                disabled={selectedSlots.length === 0 || processing}
                className="w-full py-5 rounded-2xl font-black text-sm tracking-widest bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale shadow-xl shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    LOCKING SLOTS...
                  </>
                ) : (
                  selectedSlots.length > 0 ? 'PROCEED TO CHECKOUT' : 'SELECT YOUR SLOTS'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
