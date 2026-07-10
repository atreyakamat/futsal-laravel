"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProcessRefundBtn({ 
  bookingRef, 
  amount,
  cancellationRequested
}: { 
  bookingRef: string; 
  amount: number;
  cancellationRequested: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!cancellationRequested) {
    return null;
  }

  const handleProcess = async () => {
    const refundStr = prompt(`Cancellation requested for REF: ${bookingRef}.\nTotal amount paid for this slot/booking is ₹${amount}.\nEnter the REFUND AMOUNT to issue to the user:`, '0');
    
    if (refundStr === null) return; // User cancelled prompt
    
    const refundAmount = parseFloat(refundStr);
    if (isNaN(refundAmount) || refundAmount < 0) {
      alert('Invalid refund amount.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/fg-admin/arena/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef, refundAmount })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Refund of ₹${refundAmount} processed successfully.`);
        router.refresh();
      } else {
        alert(data.message || 'Failed to process refund');
      }
    } catch (e) {
      alert('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleProcess}
      disabled={loading}
      className="mt-2 w-full btn-primary !py-2 !px-4 !bg-red-500 !text-white hover:!bg-red-600 !rounded-xl text-[10px] flex items-center justify-center gap-2"
    >
      {loading ? 'PROCESSING...' : 'PROCESS REFUND'}
    </button>
  );
}
