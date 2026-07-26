'use client';

import { useState } from 'react';

interface SlotItem {
  timeSlot: string;
  amount: number;
}

interface SuperAdminRefundBtnProps {
  bookingRef: string;
  slots: SlotItem[];          // one entry per DB row (one per slot)
  paymentStatus: string;
}

const FEE_PCT = 5;

function calcFee(amount: number) {
  return parseFloat(((amount * FEE_PCT) / 100).toFixed(2));
}

export default function SuperAdminRefundBtn({
  bookingRef,
  slots,
  paymentStatus,
}: SuperAdminRefundBtnProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (paymentStatus === 'cancelled') return null;

  const totalGross = parseFloat(slots.reduce((s, sl) => s + sl.amount, 0).toFixed(2));
  const totalFee   = parseFloat(slots.reduce((s, sl) => s + calcFee(sl.amount), 0).toFixed(2));
  const totalRefund = parseFloat((totalGross - totalFee).toFixed(2));

  const handleRefund = async () => {
    if (!reason || reason.trim().length < 3) {
      setError('Please provide a valid reason for the refund override.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/fg-admin/super-admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef, reason: reason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        setTimeout(() => {
          setOpen(false);
          window.location.reload();
        }, 2000);
      } else {
        setError(data.message || 'Refund failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isMultiSlot = slots.length > 1;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary !py-2 !px-3 !rounded-xl text-[10px] flex items-center gap-2 border-orange-500/30 text-orange-400 hover:text-orange-300 mt-2"
      >
        <span className="material-symbols-outlined text-sm">currency_rupee</span>
        FORCE REFUND
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="glass-card !p-10 max-w-lg w-full space-y-6 my-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter italic">
                  Super Admin <span className="text-orange-400">Refund</span>
                </h2>
                {isMultiSlot && (
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                    Combined Booking · {slots.length} Slots
                  </p>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Per-slot breakdown — only shown when multi-slot */}
            {isMultiSlot && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">
                  Slot Breakdown
                </p>
                {slots.map((sl, idx) => {
                  const fee = calcFee(sl.amount);
                  const slotRefund = parseFloat((sl.amount - fee).toFixed(2));
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] gap-4"
                    >
                      {/* Slot label */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[10px] font-black shrink-0">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-black text-white uppercase italic">
                          {sl.timeSlot}
                        </span>
                      </div>
                      {/* Per-slot financials */}
                      <div className="text-right shrink-0 space-y-0.5">
                        <p className="text-[10px] text-white/30 font-bold">
                          ₹{sl.amount} <span className="text-red-400">− ₹{fee}</span>
                        </p>
                        <p className="text-xs font-black text-primary">= ₹{slotRefund}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total refund breakdown */}
            <div className="border border-white/5 rounded-xl p-5 space-y-3 bg-white/[0.02]">
              {!isMultiSlot && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Slot</span>
                  <span className="font-black text-white">{slots[0]?.timeSlot}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-bold uppercase tracking-widest text-[10px]">
                  {isMultiSlot ? 'Total Gross' : 'Gross Amount'}
                </span>
                <span className="font-black text-white">₹{totalGross}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-bold uppercase tracking-widest text-[10px]">
                  Handling Fee ({FEE_PCT}%)
                </span>
                <span className="font-black text-red-400">− ₹{totalFee}</span>
              </div>
              <div className="border-t border-white/5 pt-3 flex justify-between">
                <span className="text-white/40 font-bold uppercase tracking-widest text-[10px]">
                  {isMultiSlot ? 'Total Refund' : 'Refund Amount'}
                </span>
                <span className="font-black text-primary text-lg">₹{totalRefund}</span>
              </div>
            </div>

            {/* Warning */}
            <div className="px-4 py-3 rounded-xl border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-bold">
              ⚠ This bypasses all time restrictions. A reason is required and will be logged in system audit logs.
            </div>

            {/* Reason */}
            <div>
              <label className="label-classic !ml-0 block mb-2">
                Override Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Enter detailed reason for refund override (required)..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-primary/50 resize-none"
              />
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

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setOpen(false)}
                className="btn-secondary flex-1 !py-3"
                disabled={loading}
              >
                CANCEL
              </button>
              <button
                onClick={handleRefund}
                disabled={loading}
                className="flex-1 !py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all bg-orange-500 hover:bg-orange-400 text-black flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">check</span>
                )}
                CONFIRM REFUND
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
