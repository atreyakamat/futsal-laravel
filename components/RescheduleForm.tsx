'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { mergeSlots } from '@/lib/slot-merge';

type Slot = {
  time_slot: string;
  price: number;
  status: 'available' | 'booked' | 'locked' | 'selected' | 'blocked';
};

export default function RescheduleForm({
  bookingRef,
  arenaId,
  requiredSlotCount,
  oldTotal,
  minDate,
  maxDate,
  initialDate,
}: {
  bookingRef: string;
  arenaId: number;
  requiredSlotCount: number;
  oldTotal: number;
  minDate: string;
  maxDate: string;
  initialDate: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate >= minDate && initialDate <= maxDate ? initialDate : minDate);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holidayReason, setHolidayReason] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setSelected([]);
    setError(null);
    try {
      const res = await fetch(`/api/slots/status?arena_id=${arenaId}&date=${date}`);
      const data = await res.json();
      setSlots(data.slots || []);
      setHolidayReason(data.holiday ? (data.closedReason || 'Closed') : null);
    } catch {
      setError('Failed to load slots for this date.');
    } finally {
      setLoading(false);
    }
  }, [arenaId, date]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const newTotal = selected.reduce((sum, ts) => sum + (slots.find((s) => s.time_slot === ts)?.price || 0), 0);
  const isContiguous = selected.length <= 1 || mergeSlots(selected).length === 1;
  const overBudget = newTotal > oldTotal;
  const canConfirm = selected.length === requiredSlotCount && isContiguous && !overBudget;

  const toggleSlot = (slot: Slot) => {
    if (slot.status !== 'available') return;
    setSelected((prev) => {
      if (prev.includes(slot.time_slot)) return prev.filter((s) => s !== slot.time_slot);
      if (prev.length >= requiredSlotCount) return prev; // full — must deselect first
      return [...prev, slot.time_slot];
    });
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef, newDate: date, newSlots: selected }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/booking/success/${data.newBookingRef}`);
      } else {
        setError(data.message || 'Failed to reschedule booking.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card !p-6 sm:!p-10 space-y-8">
      <div className="space-y-3">
        <label className="label-classic !ml-0">New Date</label>
        <input
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="label-classic !ml-0">
            Pick {requiredSlotCount} Contiguous Slot{requiredSlotCount > 1 ? 's' : ''}
          </label>
          <span className={`text-xs font-black uppercase tracking-widest ${selected.length === requiredSlotCount ? 'text-primary' : 'text-white/40'}`}>
            {selected.length} / {requiredSlotCount} selected
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center glass border-dashed border-white/5 rounded-2xl">
            <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
          </div>
        ) : holidayReason ? (
          <div className="py-16 text-center glass border-dashed border-white/5 rounded-2xl">
            <p className="label-classic">Closed: {holidayReason}</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="py-16 text-center glass border-dashed border-white/5 rounded-2xl">
            <p className="label-classic">No slots configured for this date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {slots.map((slot) => {
              const isSelected = selected.includes(slot.time_slot);
              const isAvailable = slot.status === 'available';
              return (
                <button
                  key={slot.time_slot}
                  type="button"
                  disabled={!isAvailable && !isSelected}
                  onClick={() => toggleSlot(slot)}
                  className={`py-3 px-3 rounded-xl border text-xs font-black transition-all flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(13,242,32,0.15)]'
                      : isAvailable
                        ? 'bg-primary/5 border-primary/20 hover:border-primary/50 hover:bg-primary/10 text-primary/90'
                        : 'cursor-not-allowed bg-white/[0.02] border-white/5 text-white/20'
                  }`}
                >
                  <span className="uppercase italic">{slot.time_slot}</span>
                  <span>₹{slot.price}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="p-4 sm:p-6 rounded-2xl border border-white/5 bg-white/[0.02] space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Original Total</span>
            <span className="font-black text-white">₹{oldTotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40 font-bold uppercase tracking-widest text-[10px]">New Total</span>
            <span className={`font-black ${overBudget ? 'text-red-400' : 'text-primary'}`}>₹{newTotal}</span>
          </div>
          {!isContiguous && (
            <p className="text-xs text-red-400 font-bold">Selected slots must be back-to-back.</p>
          )}
          {overBudget && (
            <p className="text-xs text-red-400 font-bold">New total can't exceed your original total. Pick cheaper slots.</p>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={!canConfirm || submitting}
        onClick={handleConfirm}
        className="btn-primary w-full py-5 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {submitting ? 'RESCHEDULING...' : 'CONFIRM RESCHEDULE'}
      </button>
    </div>
  );
}
