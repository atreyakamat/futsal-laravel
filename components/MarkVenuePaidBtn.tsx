'use client';

import { useState } from 'react';

interface MarkVenuePaidBtnProps {
  bookingRef: string;
  totalAmount: number;
  paymentMethod: string | null;
  venuePaymentStatus: string | null;
}

export default function MarkVenuePaidBtn({
  bookingRef,
  totalAmount,
  paymentMethod,
  venuePaymentStatus,
}: MarkVenuePaidBtnProps) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState(String(totalAmount));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (paymentMethod !== 'offline' || venuePaymentStatus === 'PAID') return null;

  const handleConfirm = async () => {
    if (!reference.trim()) {
      setError('Please enter the UPI reference / UTR number.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/fg-admin/arena/confirm-venue-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef, reference: reference.trim(), amount: parsedAmount }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || 'Payment confirmed.');
        setTimeout(() => {
          setOpen(false);
          window.location.reload();
        }, 1500);
      } else {
        setError(data.message || 'Failed to confirm payment.');
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
        className="btn-secondary !py-2 !px-3 !rounded-xl text-[10px] flex items-center gap-2 border-amber-500/30 text-amber-400 hover:text-amber-300"
      >
        <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
        MARK PAID
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="glass-card !p-10 max-w-md w-full space-y-6 my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tighter italic">
                Confirm <span className="text-amber-400">Venue Payment</span>
              </h2>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-white/40 font-medium">
              Enter the UPI reference/UTR number shown after the player pays at the venue.
            </p>

            <div className="space-y-3">
              <label className="label-classic !ml-0 block">UPI Reference / UTR</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. 123456789012"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-primary/50"
              />
            </div>

            <div className="space-y-3">
              <label className="label-classic !ml-0 block">Amount Collected (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-primary/50"
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
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 !py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">check</span>
                )}
                CONFIRM PAID
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
