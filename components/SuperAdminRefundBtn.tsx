'use client';

import { useState } from 'react';

interface SuperAdminRefundBtnProps {
  bookingRef: string;
  grossAmount: number;
  paymentStatus: string;
}

export default function SuperAdminRefundBtn({
  bookingRef,
  grossAmount,
  paymentStatus,
}: SuperAdminRefundBtnProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (paymentStatus === 'cancelled') return null;

  const serviceFee = parseFloat(((grossAmount * 5) / 100).toFixed(2));
  const refundAmount = parseFloat((grossAmount - serviceFee).toFixed(2));

  const handleRefund = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/fg-admin/super-admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef, notes }),
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card !p-10 max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tighter italic">
                Super Admin <span className="text-orange-400">Refund</span>
              </h2>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Refund Breakdown */}
            <div className="border border-white/5 rounded-xl p-5 space-y-3 bg-white/[0.02]">
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Gross Amount</span>
                <span className="font-black text-white">₹{grossAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Handling Fee (5%)</span>
                <span className="font-black text-red-400">− ₹{serviceFee}</span>
              </div>
              <div className="border-t border-white/5 pt-3 flex justify-between">
                <span className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Refund Amount</span>
                <span className="font-black text-primary text-lg">₹{refundAmount}</span>
              </div>
            </div>

            <div className="px-4 py-3 rounded-xl border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-bold">
              ⚠ This bypasses all time restrictions. The booking will be marked as cancelled immediately.
            </div>

            <div>
              <label className="label-classic !ml-0 block mb-2">Notes <span className="text-white/30">(optional)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Reason for refund..."
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
