'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Slot = {
  time_slot: string;
  price: number | string;
  status: 'available' | 'booked' | 'locked' | 'selected' | 'blocked';
};

const DAYS_VISIBLE = 4;

// Pure UTC-based date arithmetic — deliberately avoids the
// "new Date(`${str}T00:00:00`)" + toISOString() round trip. That pattern
// parses the time as *local* midnight, then toISOString() converts back to
// UTC — for any timezone ahead of UTC (e.g. India, UTC+5:30) that silently
// rolls the date back by one, turning every addDays call into a net (n-1)
// day shift (forward-by-1 became a no-op, back-by-1 jumped two days).
// Building/reading purely in UTC sidesteps local-timezone conversion
// entirely, so the arithmetic is exact regardless of the browser's zone.
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().split('T')[0];
}

// Local (not UTC) calendar date — "today" must reflect the viewer's actual
// wall-clock day. `new Date().toISOString()` converts to UTC first, which
// lags a full calendar day behind local time for part of the day in any
// UTC+ timezone (e.g. midnight-5:30am IST is still "yesterday" in UTC).
function todayLocalStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDayLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    day: d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
  };
}

export default function BookingSystem({
  arenaId,
  initialDate,
  csrfToken,
  initialCustomerName = '',
  initialCustomerMobile = '',
  initialCustomerEmail = ''
}: {
  arenaId: number;
  initialDate: string;
  csrfToken: string;
  initialCustomerName?: string;
  initialCustomerMobile?: string;
  initialCustomerEmail?: string;
}) {
  // 1. All State declarations at the top
  // `date` doubles as both the "active" booking date AND the start of the
  // visible grid window — the grid always shows this date plus the next
  // (DAYS_VISIBLE - 1) days, so there's one source of truth instead of a
  // separate window-position state that could drift out of sync with it.
  const [date, setDate] = useState(initialDate || todayLocalStr());
  const [slotsByDate, setSlotsByDate] = useState<Record<string, Slot[]>>({});
  const [holidayByDate, setHolidayByDate] = useState<Record<string, string | null>>({});
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Customer details state for quick inline mobile checkout
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerMobile, setCustomerMobile] = useState(initialCustomerMobile);
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail);

  const customerDetailsRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const todayStr = todayLocalStr();
  const windowDates = Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(date, i));
  const mobileDates = Array.from({ length: 7 }, (_, i) => addDays(todayStr, i));
  const slots = slotsByDate[date] || [];
  const holidayReason = holidayByDate[date] || null;

  // 2. Fetch Slots Logic — one call per visible column, in parallel. Still
  // just the existing single-date endpoint (no new API), so this is a
  // purely client-side reshaping of the same data the old single-day view
  // used, fetched 4x instead of 1x.
  const fetchWindow = useCallback(async () => {
    try {
      const results = await Promise.all(
        windowDates.map(async (d) => {
          const response = await fetch(`/api/slots/status?arena_id=${arenaId}&date=${d}`);
          if (!response.ok) throw new Error('Failed to fetch slot status');
          const data = await response.json();
          return { date: d, slots: data.slots || [], holiday: data.holiday ? (data.closedReason || 'Closed') : null };
        })
      );

      const nextSlotsByDate: Record<string, Slot[]> = {};
      const nextHolidayByDate: Record<string, string | null> = {};
      for (const r of results) {
        nextSlotsByDate[r.date] = r.slots;
        nextHolidayByDate[r.date] = r.holiday;
      }
      setSlotsByDate(nextSlotsByDate);
      setHolidayByDate(nextHolidayByDate);
      setRetryCount(0);
      setError(null);

      // Sync selected slots (always for the active date) with latest availability
      const activeSlots = nextSlotsByDate[date] || [];
      setSelectedSlots((prev) =>
        prev.filter((ps) =>
          activeSlots.some((s) => s.time_slot === ps.time_slot && (s.status === 'available' || s.status === 'selected'))
        )
      );
    } catch (e) {
      console.error('Fetch slots error:', e);
      setRetryCount((prev) => prev + 1);
      setError('Connection lost. Retrying...');
    } finally {
      setLoading(false);
    }
    // windowDates is derived fresh from `date` every render — depending on
    // `date` alone (not the derived array) avoids an infinite effect loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arenaId, date]);

  // 3. Effects
  // Self-heal a stale server-rendered initial date: the server computes its
  // "today" fallback using its own host timezone, which may not match the
  // viewer's. If that ever lands before the viewer's actual local today,
  // snap forward once on mount rather than showing already-past dates.
  useEffect(() => {
    const localToday = todayLocalStr();
    if (date < localToday) setDate(localToday);
    // Mount-only check — this isn't meant to re-run as `date` changes from
    // normal navigation afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchWindow();
    const interval = setInterval(fetchWindow, 30000);
    return () => clearInterval(interval);
  }, [fetchWindow]);

  useEffect(() => {
    if (retryCount > 0 && retryCount < 5) {
      const timer = setTimeout(fetchWindow, 2000 * retryCount);
      return () => clearTimeout(timer);
    } else if (retryCount >= 5) {
      setLoading(false);
      setError('System offline. Cannot reach booking servers. Please refresh the page manually.');
    }
  }, [retryCount, fetchWindow]);

  // Scroll to customer details section on mobile when first slot is selected
  useEffect(() => {
    if (selectedSlots.length > 0 && window.innerWidth < 1024) {
      setTimeout(() => {
        customerDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [selectedSlots.length]);

  // 4. Actions
  // Switching the active date always clears any in-progress selection —
  // same behavior the old date-card strip already had.
  function changeDate(newDate: string) {
    if (newDate < todayStr) newDate = todayStr;
    setDate(newDate);
    setSelectedSlots([]);
  }

  // Takes the target date explicitly (not read from the `date` state
  // closure) so a click on a non-active grid column locks/selects against
  // the column that was actually clicked, not whatever `date` was when
  // this render happened.
  async function toggleSlotForDate(targetDate: string, slot: Slot) {
    const isActiveColumn = targetDate === date;
    const isSelected = isActiveColumn && selectedSlots.some((s) => s.time_slot === slot.time_slot);

    try {
      if (isSelected) {
        await fetch('/api/slots/unlock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({ arena_id: arenaId, date: targetDate, slots: [slot.time_slot] }),
        });
        setSelectedSlots((prev) => prev.filter((s) => s.time_slot !== slot.time_slot));
      } else {
        const response = await fetch('/api/slots/lock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({ arena_id: arenaId, date: targetDate, slots: [slot.time_slot] }),
        });

        if (!response.ok) throw new Error('Lock failed');
        const data = await response.json();

        if (data.success) {
          if (!isActiveColumn) {
            // Switching columns starts a fresh selection on the new date.
            setDate(targetDate);
            setSelectedSlots([slot]);
          } else {
            setSelectedSlots((prev) => [...prev, slot]);
          }
        } else {
          alert('This slot was just taken. Refreshing...');
          fetchWindow();
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
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ arena_id: arenaId, date, slots: slotsArr }),
      });

      if (!response.ok) throw new Error('Final lock failed');
      const data = await response.json();

      if (data.success) {
        let checkoutUrl = `/booking/checkout?arena_id=${arenaId}&date=${date}&slots=${encodeURIComponent(JSON.stringify(slotsArr))}`;
        if (customerName) checkoutUrl += `&name=${encodeURIComponent(customerName)}`;
        if (customerMobile) checkoutUrl += `&mobile=${encodeURIComponent(customerMobile)}`;
        if (customerEmail) checkoutUrl += `&email=${encodeURIComponent(customerEmail)}`;
        router.push(checkoutUrl);
      } else {
        alert('Some selected slots were just taken. Refreshing...');
        fetchWindow();
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

  // Grid rows: every distinct time_slot offered on ANY visible date (a
  // weekend-only override, for example, might only appear on some
  // columns) — sorted so rows line up predictably.
  const allTimeSlots = Array.from(
    new Set(windowDates.flatMap((d) => (slotsByDate[d] || []).map((s) => s.time_slot)))
  ).sort();

  return (
    <section className="py-6 sm:py-12 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Mobile Sticky Action Bar — no backdrop-blur: a `fixed` element with
          backdrop-filter is exactly what mis-composites into a flat empty
          bar during scroll on mobile Safari/Chrome (same root cause fixed
          on the checkout page earlier). bg-dark/95 alone is opaque enough
          without it. */}
      {selectedSlots.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark/95 border-t border-white/10 px-4 py-3 flex items-center justify-between gap-4 shadow-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div>
            <div className="text-[10px] font-black text-white/50 uppercase tracking-widest">
              {selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''} selected
            </div>
            <div className="text-xl font-black text-primary italic">₹{total}</div>
          </div>
          <button
            onClick={handleProceed}
            disabled={processing}
            id="mobile-checkout-btn"
            className="btn-primary !py-3 !px-6 flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            {processing ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : null}
            {processing ? 'LOCKING...' : 'PROCEED TO CHECKOUT'}
            {!processing && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 pb-24 lg:pb-0">
        <div className="lg:col-span-8 space-y-10 lg:space-y-12">
          {/* Slot Grid — dates as columns, times as rows */}
          <div>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-3 sm:gap-4 italic mb-4">
                <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <span className="material-symbols-outlined text-lg sm:text-xl">schedule</span>
                </span>
                Pick a <span className="text-primary text-stroke">Slot</span>
              </h2>

              {/* Grid, not flex — prev/next are fixed "auto" columns that
                  can never get squeezed out of view; the middle column is
                  the only one allowed to shrink (min-w-0 + truncate), so
                  the arrows stay on-screen and clickable no matter how
                  narrow the viewport or how long the date label gets. This
                  replaced a flex row where the date button could grow wide
                  enough to push the next arrow off-screen on mobile. */}
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:inline-grid sm:w-auto">
                <button
                  type="button"
                  onClick={() => changeDate(addDays(date, -1))}
                  disabled={date <= todayStr}
                  className="btn-secondary !p-2.5 !rounded-xl disabled:opacity-20 disabled:cursor-not-allowed disabled:pointer-events-none"
                  aria-label="Previous day"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>

                {/* A button that opens the native date picker, rather than a
                    raw <input type="date"> — the raw input lets people type
                    an arbitrary date and its width/rendering is inconsistent
                    on mobile. This button fully controls its own layout and
                    the underlying input is visually hidden, only used to
                    drive showPicker(). */}
                <button
                  type="button"
                  onClick={() => dateInputRef.current?.showPicker?.()}
                  className="btn-secondary !rounded-xl !py-2.5 !px-3 sm:!px-4 min-w-0 w-full flex items-center justify-center gap-2 text-[11px] sm:text-xs"
                >
                  <span className="material-symbols-outlined text-base shrink-0">calendar_month</span>
                  <span className="truncate">
                    {new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={date}
                  min={todayStr}
                  onChange={(e) => e.target.value && changeDate(e.target.value)}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                />

                <button
                  type="button"
                  onClick={() => changeDate(addDays(date, 1))}
                  className="btn-secondary !p-2.5 !rounded-xl"
                  aria-label="Next day"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 sm:gap-6 text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/40 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(13,242,32,0.5)]" /> Available
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" /> Booked
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/40" /> Locked
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" /> Not Available
              </div>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center glass-card border-dashed border-white/5">
                <div className="w-14 h-14 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-6" />
                <span className="label-classic">Syncing real-time locks...</span>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-widest text-center">
                    {error}
                  </div>
                )}

                {/* Mobile: a horizontal date-chip strip + a single-day slot
                    list, instead of the desktop day-vs-time grid — the table
                    layout doesn't fit comfortably on small screens even with
                    horizontal scroll, so mobile gets its own simpler flow. */}
                <div className="lg:hidden">
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-5 no-scrollbar -mx-4 px-4">
                    {mobileDates.map((d) => {
                      const { weekday, day, month } = formatDayLabel(d);
                      const isActive = d === date;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => changeDate(d)}
                          className={`shrink-0 flex flex-col items-center justify-center w-16 py-3 rounded-2xl border transition-all ${
                            isActive
                              ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(13,242,32,0.15)]'
                              : 'border-white/5 bg-white/[0.02] text-white/50'
                          }`}
                        >
                          <span className="text-[9px] font-black uppercase tracking-widest">{weekday}</span>
                          <span className="text-lg font-black italic">{day}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest">{month}</span>
                        </button>
                      );
                    })}
                  </div>

                  {holidayReason ? (
                    <div className="py-16 text-center glass-card border-dashed border-white/5">
                      <p className="label-classic">Closed: {holidayReason}</p>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="py-16 text-center glass-card border-dashed border-white/5">
                      <p className="label-classic">No slots configured for this date.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {slots.map((slot) => {
                        const isSelected = selectedSlots.some((s) => s.time_slot === slot.time_slot);
                        const isBookedOrBlocked = slot.status === 'booked' || slot.status === 'blocked';
                        const isLocked = slot.status === 'locked';
                        const isClickable = !isBookedOrBlocked && !isLocked;

                        return (
                          <button
                            key={slot.time_slot}
                            type="button"
                            disabled={!isClickable}
                            onClick={() => toggleSlotForDate(date, slot)}
                            className={`w-full py-3.5 px-4 rounded-xl border text-xs font-black transition-all flex items-center justify-between ${
                              isBookedOrBlocked
                                ? 'opacity-30 grayscale cursor-not-allowed bg-white/[0.02] border-white/5 text-white/30'
                                : isLocked
                                  ? 'opacity-40 cursor-not-allowed border-white/5 text-white/30'
                                  : isSelected
                                    ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(13,242,32,0.15)]'
                                    : 'bg-white/[0.02] border-white/5 hover:border-primary/50 text-white/70'
                            }`}
                          >
                            <span className="uppercase italic">{slot.time_slot}</span>
                            <span className="flex items-center gap-1.5">
                              {isSelected && <span className="material-symbols-outlined text-base">check_circle</span>}
                              {isBookedOrBlocked ? 'Booked' : isLocked ? 'Locked' : `₹${slot.price}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {allTimeSlots.length === 0 ? (
                  <div className="hidden lg:block py-24 text-center glass-card border-dashed border-white/5">
                    <p className="label-classic">No slots configured for these dates.</p>
                  </div>
                ) : (
                  <div className="hidden lg:block overflow-x-auto rounded-2xl border border-white/5">
                    <table className="w-full border-collapse min-w-[560px]">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-dark p-3 text-left">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Time</span>
                          </th>
                          {windowDates.map((d) => {
                            const { weekday, day, month } = formatDayLabel(d);
                            const isActive = d === date;
                            return (
                              <th
                                key={d}
                                className={`p-3 text-center border-l border-white/5 ${isActive ? 'bg-primary/10' : ''}`}
                              >
                                <div className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-primary' : 'text-white/40'}`}>
                                  {weekday}
                                </div>
                                <div className={`text-lg font-black italic ${isActive ? 'text-primary' : 'text-white'}`}>{day}</div>
                                <div className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-primary' : 'text-white/40'}`}>
                                  {month}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {allTimeSlots.map((timeSlot) => (
                          <tr key={timeSlot} className="border-t border-white/5">
                            <td className="sticky left-0 z-10 bg-dark p-3 text-xs font-black uppercase italic text-white/70 whitespace-nowrap">
                              {timeSlot}
                            </td>
                            {windowDates.map((d) => {
                              const dayHoliday = holidayByDate[d];
                              const slot = (slotsByDate[d] || []).find((s) => s.time_slot === timeSlot);
                              const isActiveColumn = d === date;
                              const isSelected = isActiveColumn && selectedSlots.some((s) => s.time_slot === timeSlot);

                              if (dayHoliday) {
                                return (
                                  <td key={d} className="p-3 text-center border-l border-white/5 text-white/15 text-[10px] font-bold uppercase tracking-widest">
                                    Closed
                                  </td>
                                );
                              }
                              if (!slot) {
                                return <td key={d} className="p-3 text-center border-l border-white/5 text-white/10">—</td>;
                              }

                              const isBookedOrBlocked = slot.status === 'booked' || slot.status === 'blocked';
                              const isLocked = slot.status === 'locked';
                              const isClickable = !isBookedOrBlocked && !isLocked;

                              return (
                                <td key={d} className="p-1.5 text-center border-l border-white/5">
                                  <button
                                    type="button"
                                    disabled={!isClickable}
                                    onClick={() => toggleSlotForDate(d, slot)}
                                    className={`w-full py-2.5 px-2 rounded-xl border text-[11px] font-black transition-all ${
                                      isBookedOrBlocked
                                        ? 'opacity-30 grayscale cursor-not-allowed bg-white/[0.02] border-white/5 text-white/30'
                                        : isLocked
                                          ? 'opacity-40 cursor-not-allowed border-white/5 text-white/30'
                                          : isSelected
                                            ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(13,242,32,0.15)]'
                                            : 'bg-white/[0.02] border-white/5 hover:border-primary/50 hover:bg-white/[0.04] text-white/70'
                                    }`}
                                  >
                                    {isSelected ? (
                                      <span className="flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        ₹{slot.price}
                                      </span>
                                    ) : isBookedOrBlocked ? (
                                      'Booked'
                                    ) : isLocked ? (
                                      'Locked'
                                    ) : (
                                      `₹${slot.price}`
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step 3: Customer Details Section — rendered when slots are selected */}
          {selectedSlots.length > 0 && (
            <div ref={customerDetailsRef} id="customer-details-section" className="pt-6 border-t border-white/10 transition-all duration-300 animate-fadeIn">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-3 sm:gap-4 italic">
                  <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                    <span className="material-symbols-outlined text-lg sm:text-xl">person</span>
                  </span>
                  Customer <span className="text-primary text-stroke">Details</span>
                </h2>
                <span className="pill-status">
                  <span className="material-symbols-outlined text-xs">lock</span>
                  Secure Lock
                </span>
              </div>

              {/* No .glass-card here (backdrop-blur-xl) — this section
                  sits directly below an orange-selected slot card in
                  normal scroll flow on mobile, and a backdrop-blur layer
                  scrolling past a solid-color neighbor is exactly what
                  flashes as a flat/empty colored bar during momentum
                  scroll (same root cause as the checkout page and mobile
                  sticky bar fixes). Same visual weight without the blur. */}
              <div className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] !p-6 sm:!p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="booking_customer_name" className="label-classic">Full Name</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-lg">
                        person
                      </span>
                      <input
                        id="booking_customer_name"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="John Doe"
                        className="input-field pl-11 !py-3.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="booking_customer_mobile" className="label-classic">Mobile Number</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-lg">
                        phone_iphone
                      </span>
                      <input
                        id="booking_customer_mobile"
                        type="tel"
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="input-field pl-11 !py-3.5 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="booking_customer_email" className="label-classic">
                    Email Address <span className="text-white/20 italic lowercase">(optional)</span>
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-lg">
                      mail
                    </span>
                    <input
                      id="booking_customer_email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="input-field pl-11 !py-3.5 text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleProceed}
                  disabled={processing}
                  id="inline-proceed-btn"
                  className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-3 mt-4"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      LOCKING SLOTS...
                    </>
                  ) : (
                    <>
                      PROCEED TO CHECKOUT (₹{total})
                      <span className="material-symbols-outlined font-black">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Summary — desktop only */}
        <div className="hidden lg:block lg:col-span-4">
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
                ) : (selectedSlots?.length || 0) > 0 ? (
                  <>
                    PROCEED TO CHECKOUT
                    <span className="material-symbols-outlined font-black">arrow_forward</span>
                  </>
                ) : (
                  'PICK SLOTS TO START'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
