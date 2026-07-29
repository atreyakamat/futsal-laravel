"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { evaluateCancellationEligibility, calculateRefundAmount } from '@/lib/refund-policy';

export default function CancelBookingBtn({ 
  bookingRef, 
  bookingDateStr, 
  timeSlots, 
  isCancellationRequested,
  paymentStatus,
  refundAmount,
  cancellationReason,
  updatedAt,
  totalAmount,
}: { 
  bookingRef: string; 
  bookingDateStr: string; 
  timeSlots: string[];
  isCancellationRequested: boolean;
  paymentStatus: string;
  refundAmount: number | null;
  cancellationReason: string | null;
  updatedAt: string | Date;
  totalAmount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Evaluate eligibility on client for instant UI state determination
  const eligibility = evaluateCancellationEligibility(bookingDateStr, timeSlots);

  // Calculate 5% fee and expected refund for display
  const { serviceFee, refundAmount: calculatedRefund } = calculateRefundAmount(totalAmount);
  const displayRefund = refundAmount ?? calculatedRefund;

  const formattedDate = new Date(updatedAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Render Refunded State
  if (paymentStatus === 'cancelled' || paymentStatus === 'refunded') {
    return (
      <div className="mt-6 w-full p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
        <div className="flex items-center gap-2 font-black uppercase tracking-wider mb-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          Cancellation Refunded
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-white/70">
          <div><span className="text-white/40">Refund Amount:</span> <strong className="text-emerald-400">₹{displayRefund}</strong></div>
          <div><span className="text-white/40">Service Fee (5%):</span> ₹{serviceFee}</div>
          <div><span className="text-white/40">Processed On:</span> {formattedDate}</div>
          <div><span className="text-white/40">Status:</span> Refund Processed</div>
        </div>
      </div>
    );
  }

  // Render Pending Cancellation Requested State
  if (isCancellationRequested) {
    const isRejected = cancellationReason && cancellationReason.toLowerCase().includes('reject');

    return (
      <div className={`mt-6 w-full p-5 rounded-2xl border text-xs space-y-3 ${
        isRejected ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black uppercase tracking-wider text-sm">
            <span className="material-symbols-outlined text-lg">
              {isRejected ? 'cancel' : 'pending_actions'}
            </span>
            {isRejected ? 'Cancellation Request Rejected' : 'Cancellation Requested'}
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-black/30 border border-white/10">
            {isRejected ? 'REJECTED' : 'PENDING REVIEW'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-white/80 pt-2 border-t border-white/10">
          <div><span className="text-white/40">Requested On:</span> {formattedDate}</div>
          <div><span className="text-white/40">Booking Ref:</span> <span className="font-mono text-primary">{bookingRef}</span></div>
          <div><span className="text-white/40">Original Total:</span> ₹{totalAmount}</div>
          <div><span className="text-white/40">Expected Refund:</span> <strong className="text-primary">₹{displayRefund}</strong> (5% fee deducted)</div>
        </div>

        <div className="text-[11px] italic text-white/60 pt-1">
          {isRejected
            ? `Rejection Reason: ${cancellationReason}`
            : 'Your cancellation request is currently being reviewed by our team. The refund will be credited upon approval.'}
        </div>
      </div>
    );
  }

  // Render Completed / Past Booking State
  if (eligibility.code === 'PAST_BOOKING') {
    return (
      <div className="mt-4 px-4 py-2 bg-white/5 border border-white/10 text-white/40 font-black rounded-xl text-[10px] uppercase tracking-widest text-center flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-sm">task_alt</span>
        GAME COMPLETED
      </div>
    );
  }

  // Render Late Cancellation Window Closed (< 3h away)
  if (eligibility.code === 'LATE_CANCELLATION') {
    return (
      <div className="mt-4 px-4 py-2 bg-white/5 border border-white/10 text-white/40 font-black rounded-xl text-[10px] uppercase tracking-widest text-center flex items-center justify-center gap-2" title="Cancellations are only allowed at least 3 hours before slot start time">
        <span className="material-symbols-outlined text-sm">lock_clock</span>
        CANCELLATION WINDOW CLOSED (&lt; 3H)
      </div>
    );
  }

  if (paymentStatus !== 'confirmed') {
    return null;
  }

  const handleCancel = async () => {
    if (!confirm(`Request cancellation for Booking ${bookingRef}?\n\nA 5% service fee (₹${serviceFee}) will be deducted. Your expected refund is ₹${calculatedRefund}.`)) {
      return;
    }
    
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef })
      });

      const data = await res.json();

      if (data.success) {
        alert(`Cancellation requested successfully. Expected refund: ₹${data.refundAmount}`);
        router.refresh();
      } else {
        setErrorMsg(data.message || 'Failed to cancel booking');
        alert(data.message || 'Cancellation rejected');
      }
    } catch (e) {
      setErrorMsg('An unexpected network error occurred.');
      alert('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 w-full md:w-auto">
      {errorMsg && (
        <p className="text-[10px] text-red-400 font-bold mb-2 uppercase tracking-wider">{errorMsg}</p>
      )}
      <button 
        onClick={handleCancel}
        disabled={loading}
        className="w-full md:w-auto px-4 py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 border border-white/10 hover:border-red-500/30 text-white/70 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
      >
        {loading ? 'Processing...' : 'Request Cancellation'}
        <span className="material-symbols-outlined text-base">cancel</span>
      </button>
    </div>
  );
}
