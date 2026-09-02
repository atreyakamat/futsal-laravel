'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffCancelBookingBtn({ bookingRef, paymentStatus }: { bookingRef: string; paymentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    const reason = prompt(`Cancel booking ${bookingRef}?\n\nOptional reason (shown in audit logs):`);
    if (reason === null) return;

    setLoading(true);
    try {
      const res = await fetch('/api/fg-admin/platform/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_ref: bookingRef, reason }),
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        alert(data.message || 'Failed to cancel booking.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="btn-secondary !py-2 !px-3 !rounded-xl text-[10px] flex items-center gap-2 border-red-500/30 text-red-400 hover:text-red-300"
    >
      <span className="material-symbols-outlined text-sm">cancel</span>
      {loading ? 'CANCELLING...' : paymentStatus === 'pending' ? 'CANCEL (UNPAID)' : 'CANCEL BOOKING'}
    </button>
  );
}
