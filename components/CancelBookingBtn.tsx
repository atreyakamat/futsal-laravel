"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { evaluateCancellationEligibility, evaluateRescheduleEligibility, calculateRefundAmount, computeRefundLifecycleStatus, DEFAULT_REFUND_TIMELINE } from '@/lib/refund-policy';

export default function CancelBookingBtn({
  bookingRef,
  bookingDateStr,
  timeSlots,
  isCancellationRequested,
  paymentStatus,
  refundAmount,
  cancellationReason,
  updatedAt,
  createdAt,
  totalAmount,
  refundTimeline = DEFAULT_REFUND_TIMELINE,
  payuMihpayid,
  refundStatus,
  paymentMethod,
  venuePaymentStatus,
  cutoffHours,
  refundFeeMode = 'FIXED',
  refundFeeValue = 300,
  refundsEnabled = false,
  rescheduleUsed = false,
  adminCreated = false,
}: {
  bookingRef: string;
  bookingDateStr: string;
  timeSlots: string[];
  isCancellationRequested: boolean;
  paymentStatus: string;
  refundAmount: number | null;
  cancellationReason: string | null;
  updatedAt: string | Date;
  createdAt: string | Date;
  totalAmount: number;
  refundTimeline?: string;
  payuMihpayid?: string | null;
  refundStatus?: string | null;
  paymentMethod?: string | null;
  venuePaymentStatus?: string | null;
  cutoffHours?: number;
  refundFeeMode?: 'FIXED' | 'PERCENTAGE';
  refundFeeValue?: number;
  refundsEnabled?: boolean;
  rescheduleUsed?: boolean;
  adminCreated?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeCutoffHours = cutoffHours ?? 24;

  const rescheduleEligibility = evaluateRescheduleEligibility(bookingDateStr, timeSlots, Date.now(), rescheduleUsed, paymentStatus);
  const canReschedule = paymentStatus === 'confirmed' && !isCancellationRequested && rescheduleEligibility.allowed;

  // Evaluate time eligibility for cancellation — cancellation itself stays
  // available right up to game start; refundEligible is the gated part.
  const eligibility = evaluateCancellationEligibility(bookingDateStr, timeSlots, Date.now(), activeCutoffHours, createdAt);

  // Default policy: refund-eligible cancellation (see app/api/bookings/cancel/route.ts)
  // — refundsEnabled is a per-arena opt-OUT. A pay-at-venue booking with
  // nothing collected never owed a refund either way, and the time-window
  // rule above can also close out refund eligibility on its own.
  const noRefundApplies = !refundsEnabled || !eligibility.refundEligible || (paymentMethod === 'offline' && venuePaymentStatus !== 'PAID');

  // Calculate fee and expected refund amount based on active policy
  const { serviceFee, refundAmount: calculatedRefund, feeMode, feeValue } = calculateRefundAmount(totalAmount, {
    mode: refundFeeMode,
    value: refundFeeValue,
  }, timeSlots.length);
  const displayRefund = refundAmount ?? calculatedRefund;

  const feeLabel = feeMode === 'PERCENTAGE'
    ? `Cancellation Fee (${feeValue}%):`
    : `Cancellation Fee (₹${feeValue} × ${timeSlots.length} slot${timeSlots.length > 1 ? 's' : ''}):`;

  // Compute structured lifecycle status and messages
  const lifecycle = computeRefundLifecycleStatus({
    payment_status: paymentStatus,
    cancellation_requested: isCancellationRequested,
    cancellation_reason: cancellationReason,
    refund_amount: refundAmount,
    refund_status: refundStatus,
  });

  const formattedDate = new Date(updatedAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Render Completed / Refunded State Panel
  if (lifecycle.isRefunded) {
    return (
      <div className="mt-6 w-full p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black uppercase tracking-wider text-sm">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            Refund Information
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
            REFUNDED
          </span>
        </div>

        <p className="text-[11px] font-medium text-emerald-300">{lifecycle.customerMessage}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-white/80 pt-2 border-t border-emerald-500/20">
          <div><span className="text-white/40">Booking Ref:</span> <span className="font-mono text-emerald-300">{bookingRef}</span></div>
          <div><span className="text-white/40">Original Amount:</span> ₹{totalAmount}</div>
          <div><span className="text-white/40">{feeLabel}</span> ₹{serviceFee}</div>
          <div><span className="text-white/40">Refund Amount:</span> <strong className="text-emerald-300 font-extrabold text-sm">₹{displayRefund}</strong></div>
          <div><span className="text-white/40">Refund Date:</span> {formattedDate}</div>
          <div><span className="text-white/40">Gateway Reference:</span> <span className="font-mono">{payuMihpayid || bookingRef}</span></div>
        </div>
      </div>
    );
  }

  // Render Rejected State Panel
  if (lifecycle.isRejected) {
    const rawReason = cancellationReason?.replace(/^REJECTED:\s*/i, '') || 'Cancellation request rejected by administration.';
    return (
      <div className="mt-6 w-full p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black uppercase tracking-wider text-sm">
            <span className="material-symbols-outlined text-lg">cancel</span>
            Refund Information
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/20 border border-red-500/30 text-red-300">
            REJECTED
          </span>
        </div>

        <p className="text-[11px] font-medium text-red-300">{lifecycle.customerMessage}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-white/80 pt-2 border-t border-red-500/20">
          <div><span className="text-white/40">Booking Ref:</span> <span className="font-mono text-red-300">{bookingRef}</span></div>
          <div><span className="text-white/40">Original Amount:</span> ₹{totalAmount}</div>
          <div><span className="text-white/40">Refund Status:</span> <strong className="text-red-300">Rejected</strong></div>
          <div><span className="text-white/40">Rejected On:</span> {formattedDate}</div>
        </div>

        <div className="text-[11px] text-red-300/90 bg-black/30 p-3 rounded-xl border border-red-500/20">
          <strong className="text-red-400">Rejection Reason:</strong> {rawReason}
        </div>
      </div>
    );
  }

  // Render No-Refund-Due Panel (pay-at-venue booking, nothing was collected)
  if (lifecycle.isNotApplicable) {
    return (
      <div className="mt-6 w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black uppercase tracking-wider text-sm text-white/70">
            <span className="material-symbols-outlined text-lg">info</span>
            Cancellation Status
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${lifecycle.badgeClass}`}>
            {lifecycle.statusText}
          </span>
        </div>
        <p className="text-[11px] font-medium text-white/50">{lifecycle.customerMessage}</p>
        <div className="text-[11px] text-white/40 pt-2 border-t border-white/10">
          <span className="text-white/30">Booking Reference:</span> <span className="font-mono text-white/60">{bookingRef}</span>
        </div>
      </div>
    );
  }

  // Render Cancellation Requested Panel (Pending Review / Approved / Processing)
  if (isCancellationRequested) {
    return (
      <div className="mt-6 w-full p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black uppercase tracking-wider text-sm">
            <span className="material-symbols-outlined text-lg">pending_actions</span>
            Refund Information
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${lifecycle.badgeClass}`}>
            {lifecycle.statusText}
          </span>
        </div>

        <p className="text-[11px] font-medium text-amber-200/90">{lifecycle.customerMessage}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-white/80 pt-2 border-t border-amber-500/20">
          <div><span className="text-white/40">Booking Reference:</span> <span className="font-mono text-primary">{bookingRef}</span></div>
          <div><span className="text-white/40">Cancellation Requested On:</span> {formattedDate}</div>
          <div><span className="text-white/40">Original Amount:</span> ₹{totalAmount}</div>
          <div><span className="text-white/40">{feeLabel}</span> ₹{serviceFee}</div>
          <div><span className="text-white/40">Refund Amount:</span> <strong className="text-primary font-bold text-sm">₹{displayRefund}</strong></div>
          <div><span className="text-white/40">Refund Status:</span> <strong className="text-amber-300">{lifecycle.statusText}</strong></div>
        </div>

        <div className="text-[11px] text-white/70 bg-black/30 p-3 rounded-xl border border-white/10 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">schedule</span>
          <span><strong>Expected Processing Time:</strong> {refundTimeline}</span>
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

  if (paymentStatus !== 'confirmed') {
    return null;
  }

  // Staff booked this on the customer's behalf (see
  // app/api/fg-admin/platform/bookings/route.ts) — only staff (super_admin,
  // admin, arena_admin, manager) can cancel/refund it, via the admin
  // bookings list. Self-service cancellation and reschedule stay off the
  // table here regardless of refund eligibility.
  if (adminCreated) {
    return (
      <div className="mt-4 w-full md:w-auto px-4 py-3 bg-white/5 border border-white/10 text-white/40 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center max-w-xs md:ml-auto">
        This booking was made on your behalf by our team. Contact the arena or support to cancel or change it.
      </div>
    );
  }

  const noRefundReason = (() => {
    if (paymentMethod === 'offline' && venuePaymentStatus !== 'PAID') {
      return 'This is a pay-at-venue booking and no payment was collected, so no refund applies.';
    }
    if (!refundsEnabled) {
      return `No refund is issued for cancellations at this arena.${canReschedule ? ' Consider rescheduling instead — you can still move this booking to a new slot at no cost.' : ''}`;
    }
    if (eligibility.code === 'NO_REFUND_MONTH_EXPIRED') {
      return 'The refund window for this booking (through the end of the month it was paid in) has closed, so no refund applies.';
    }
    return `This booking starts within ${activeCutoffHours} hours, so it is no longer eligible for a refund.`;
  })();

  const handleCancel = async () => {
    const confirmMessage = noRefundApplies
      ? `Cancel Booking ${bookingRef}?\n\n${noRefundReason}`
      : (() => {
          const feeDescription = feeMode === 'PERCENTAGE'
            ? `${feeValue}% cancellation fee (₹${serviceFee})`
            : `cancellation fee of ₹${feeValue} × ${timeSlots.length} slot${timeSlots.length > 1 ? 's' : ''} (₹${serviceFee})`;
          return `Request cancellation for Booking ${bookingRef}?\n\nA ${feeDescription} will be deducted. Your expected refund is ₹${calculatedRefund}.\n\nExpected Refund Timeline: ${refundTimeline}`;
        })();
    if (!confirm(confirmMessage)) {
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
        alert(data.message || (data.refundEligible === false
          ? 'Booking cancelled. No refund is due.'
          : `Cancellation requested successfully. Expected refund: ₹${data.refundAmount}. Timeline: ${refundTimeline}`));
        router.refresh();
      } else {
        setErrorMsg(data.message || 'Failed to cancel booking');
        alert(data.message || 'Cancellation rejected');
      }
    } catch {
      setErrorMsg('An unexpected network error occurred.');
      alert('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 w-full md:w-auto flex flex-col md:items-end gap-2">
      {errorMsg && (
        <p className="text-[10px] text-red-400 font-bold mb-2 uppercase tracking-wider">{errorMsg}</p>
      )}
      {noRefundApplies && refundsEnabled && (paymentMethod !== 'offline' || venuePaymentStatus === 'PAID') && (
        <p className="text-[10px] text-amber-400/80 font-bold mb-1 uppercase tracking-wider text-right max-w-xs">{noRefundReason}</p>
      )}
      {canReschedule && (
        <Link
          href={`/dashboard/reschedule/${bookingRef}`}
          className="w-full md:w-auto px-4 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-bold rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
        >
          Reschedule Booking
          <span className="material-symbols-outlined text-base">event_repeat</span>
        </Link>
      )}
      <button
        onClick={handleCancel}
        disabled={loading}
        className="w-full md:w-auto px-4 py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 border border-white/10 hover:border-red-500/30 text-white/70 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
      >
        {loading ? 'Processing...' : noRefundApplies ? 'Cancel (No Refund)' : 'Request Cancellation'}
        <span className="material-symbols-outlined text-base">cancel</span>
      </button>
    </div>
  );
}
