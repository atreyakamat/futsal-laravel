"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelBookingBtn({ 
  bookingRef, 
  bookingDateStr, 
  slotStart, 
  isCancellationRequested,
  paymentStatus
}: { 
  bookingRef: string; 
  bookingDateStr: string; 
  slotStart: string;
  isCancellationRequested: boolean;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Check if booking is in the past or < 6 hours away
  const bookingDateTime = new Date(`${bookingDateStr}T${slotStart}:00+05:30`);
  const msUntilBooking = bookingDateTime.getTime() - Date.now();
  const isTooLate = msUntilBooking < 6 * 60 * 60 * 1000;
  
  if (paymentStatus === 'cancelled' || paymentStatus === 'refunded') {
    return (
      <div className="mt-4 px-4 py-2 border border-red-500/20 bg-red-500/10 text-red-500 font-bold rounded-lg text-xs text-center uppercase tracking-widest">
        Booking Cancelled
      </div>
    );
  }

  if (isCancellationRequested) {
    return (
      <div className="mt-4 px-4 py-2 border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 font-bold rounded-lg text-xs text-center uppercase tracking-widest">
        Cancellation Requested
      </div>
    );
  }

  if (isTooLate || paymentStatus !== 'confirmed') {
    return null;
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to request a cancellation for this booking? The refund amount will be decided by the admin.')) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef })
      });
      const data = await res.json();
      if (data.success) {
        alert('Cancellation requested successfully.');
        router.refresh();
      } else {
        alert(data.message || 'Failed to cancel');
      }
    } catch (e) {
      alert('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleCancel}
      disabled={loading}
      className="mt-4 w-full md:w-auto px-4 py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 border border-white/10 hover:border-red-500/30 text-white/70 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
    >
      {loading ? 'Processing...' : 'Request Cancellation'}
      <span className="material-symbols-outlined text-base">cancel</span>
    </button>
  );
}
