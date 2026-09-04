'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Slot = {
  time_slot: string;
  price: number;
  status: 'available' | 'booked' | 'locked' | 'selected' | 'blocked';
};

type Props = {
  arenas: { id: number; name: string }[];
  scopedArenaId: number | null;
  scopedArenaName: string | null;
};

function todayLocalStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function StaffBookingForm({ arenas, scopedArenaId, scopedArenaName }: Props) {
  const router = useRouter();
  const [arenaId, setArenaId] = useState<number | null>(scopedArenaId ?? arenas[0]?.id ?? null);
  const [date, setDate] = useState(todayLocalStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [holidayReason, setHolidayReason] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [hasGstin, setHasGstin] = useState(false);
  const [customerGstin, setCustomerGstin] = useState('');
  const [wantsCompanyName, setWantsCompanyName] = useState(false);
  const [customerCompanyName, setCustomerCompanyName] = useState('');

  const [freeBooking, setFreeBooking] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isDiscounted = discountedPrice.trim() !== '';
  // Only the plain (not free, not discounted) path is the "customer pays
  // online later" flow this feature is for — email matters there since it's
  // the only correspondence channel before the customer ever logs in.
  const emailRequired = !freeBooking && !isDiscounted;

  useEffect(() => {
    if (!arenaId || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setSelected([]);
    setHolidayReason(null);
    fetch(`/api/slots/status?arena_id=${arenaId}&date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHolidayReason(data.holiday ? (data.closedReason || 'Closed') : null);
          setSlots(data.slots || []);
        }
      })
      .catch(() => setError('Failed to load slot availability.'))
      .finally(() => setLoadingSlots(false));
  }, [arenaId, date]);

  const toggleSlot = (slot: Slot) => {
    if (slot.status !== 'available') return;
    setSelected((prev) =>
      prev.includes(slot.time_slot) ? prev.filter((s) => s !== slot.time_slot) : [...prev, slot.time_slot]
    );
  };

  const total = slots
    .filter((s) => selected.includes(s.time_slot))
    .reduce((sum, s) => sum + (freeBooking ? 0 : isDiscounted ? Number(discountedPrice) || 0 : s.price), 0);

  const handleSubmit = async () => {
    setError('');
    if (!arenaId) { setError('Pick an arena.'); return; }
    if (!date) { setError('Pick a date.'); return; }
    if (selected.length === 0) { setError('Pick at least one slot.'); return; }
    if (!customerName.trim() || !customerMobile.trim()) { setError('Customer name and mobile are required.'); return; }
    if (emailRequired && !customerEmail.trim()) { setError('Customer email is required for a pay-later booking.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/fg-admin/platform/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arena_id: arenaId,
          date,
          slots: selected,
          customer_name: customerName.trim(),
          customer_mobile: customerMobile.trim(),
          customer_email: customerEmail.trim() || null,
          customer_gstin: hasGstin ? customerGstin.trim() || null : null,
          customer_company_name: wantsCompanyName ? customerCompanyName.trim() || null : null,
          free_booking: freeBooking,
          discounted_price_per_slot: isDiscounted ? Number(discountedPrice) : undefined,
          payment_method: paymentMethod || undefined,
          payment_reference: paymentReference || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(data.redirectTo || '/fg-admin/platform/bookings');
      } else {
        setError(data.message || 'Failed to create booking.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label-classic">Arena</label>
          {arenas.length > 0 ? (
            <select
              className="input-field"
              value={arenaId ?? ''}
              onChange={(e) => setArenaId(Number(e.target.value) || null)}
            >
              {arenas.map((arena) => (
                <option key={arena.id} value={arena.id}>{arena.name}</option>
              ))}
            </select>
          ) : (
            <input className="input-field" value={scopedArenaName ?? 'No arena assigned'} readOnly />
          )}
        </div>
        <div className="space-y-2">
          <label className="label-classic">Booking Date</label>
          <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        <label className="label-classic">Available Slots</label>
        {loadingSlots ? (
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Loading slots...</p>
        ) : holidayReason ? (
          <p className="text-xs text-red-400 font-bold uppercase tracking-widest">Closed — {holidayReason}</p>
        ) : slots.length === 0 ? (
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest">No slots configured for this date.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {slots.map((slot) => {
              const isSelected = selected.includes(slot.time_slot);
              const disabled = slot.status !== 'available';
              return (
                <button
                  key={slot.time_slot}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleSlot(slot)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : disabled
                        ? 'border-white/5 bg-white/[0.02] text-white/20 cursor-not-allowed'
                        : 'border-white/10 hover:border-primary/40 text-white/80'
                  }`}
                >
                  <div className="text-xs font-black uppercase italic">{slot.time_slot}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                    {disabled ? slot.status : `₹${slot.price}`}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {selected.length > 0 && (
          <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
            {selected.length} slot{selected.length > 1 ? 's' : ''} selected — Total ₹{total}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label-classic">Customer Name</label>
          <input className="input-field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="label-classic">Customer Mobile</label>
          <input className="input-field" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="label-classic">
          Customer Email {emailRequired ? <span className="text-red-400">*</span> : <span className="text-white/20 italic lowercase">(optional)</span>}
        </label>
        <input type="email" className="input-field" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest cursor-pointer">
          <input type="checkbox" checked={hasGstin} onChange={(e) => setHasGstin(e.target.checked)} className="w-4 h-4 accent-primary" />
          Does the customer have a GST number?
        </label>
        {hasGstin && (
          <input type="text" className="input-field" placeholder="GSTIN" value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} />
        )}

        <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest cursor-pointer">
          <input type="checkbox" checked={wantsCompanyName} onChange={(e) => setWantsCompanyName(e.target.checked)} className="w-4 h-4 accent-primary" />
          Should the invoice show a company name?
        </label>
        {wantsCompanyName && (
          <input type="text" className="input-field" placeholder="Company Name" value={customerCompanyName} onChange={(e) => setCustomerCompanyName(e.target.value)} />
        )}
      </div>

      <label className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest">
        <input
          type="checkbox"
          checked={freeBooking}
          onChange={(e) => setFreeBooking(e.target.checked)}
          className="w-4 h-4 accent-primary"
        />
        Free booking (managers need super admin/arena admin approval)
      </label>

      <div className="space-y-2">
        <label className="label-classic">Discounted Price Per Slot (₹)</label>
        <input
          type="number"
          min="0"
          step="1"
          className="input-field"
          placeholder="Leave blank for normal price — or for a pay-later online booking"
          value={discountedPrice}
          onChange={(e) => setDiscountedPrice(e.target.value)}
        />
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
          Leave both this and Free Booking unchecked to book on the customer&apos;s behalf with payment left pending — they&apos;ll see it and pay online once they log in.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="label-classic">Payment Method</label>
          <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="">— Not collected yet —</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="label-classic">Payment Reference</label>
          <input
            className="input-field"
            placeholder="UPI UTR / cash receipt no."
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
          />
        </div>
      </div>
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest -mt-4">
        Only used for a Discounted booking — record the cash/UPI payment collected from the customer to mark it paid and issue an invoice. Ignored for a Free booking or a pay-later online booking.
      </p>

      <div className="space-y-2">
        <label className="label-classic">Notes</label>
        <textarea className="input-field" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold">
          {error}
        </div>
      )}

      <button type="button" className="btn-primary disabled:opacity-40" disabled={submitting} onClick={handleSubmit}>
        {submitting ? 'Submitting...' : 'Submit Booking'}
      </button>
    </div>
  );
}
