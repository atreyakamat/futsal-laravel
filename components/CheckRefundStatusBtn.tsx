'use client';

import { useState } from 'react';

const CHECKABLE_STATES = ['PROCESSING', 'INITIATED', 'PENDING_REVIEW'];

interface CheckRefundStatusBtnProps {
  bookingRef: string;
  refundStatus?: string | null;
}

export default function CheckRefundStatusBtn({ bookingRef, refundStatus }: CheckRefundStatusBtnProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  if (!refundStatus || !CHECKABLE_STATES.includes(refundStatus)) return null;

  const handleCheck = async () => {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/fg-admin/super-admin/refund/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_ref: bookingRef }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`PayU: ${data.raw?.status || 'unknown'} → ${data.mapped?.refund_status}`);
        setTimeout(() => window.location.reload(), 1800);
      } else {
        setResult(data.message || 'Check failed.');
      }
    } catch {
      setResult('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleCheck}
        disabled={loading}
        className="btn-secondary !py-2 !px-3 !rounded-xl text-[10px] flex items-center gap-2 border-blue-500/30 text-blue-400 hover:text-blue-300"
      >
        <span className="material-symbols-outlined text-sm">sync</span>
        {loading ? 'CHECKING...' : 'CHECK PAYU STATUS'}
      </button>
      {result && <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest max-w-[160px] text-right">{result}</p>}
    </div>
  );
}
