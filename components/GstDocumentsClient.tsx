'use client';

import { useEffect, useState } from 'react';

interface Invoice {
  id: number;
  booking_ref: string;
  invoice_no: string;
  issue_datetime: string;
  gross_amount: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  customer_name: string;
}

interface CreditNote {
  id: number;
  booking_ref: string;
  note_no: string;
  issue_date: string;
  amount: number;
  taxable_value_reversed: number;
  cgst_reversed: number;
  sgst_reversed: number;
  linked_invoice_no: string;
}

interface NeedsAttention {
  booking_ref: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

export default function GstDocumentsClient({ readOnly = false }: { readOnly?: boolean } = {}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [needsAttention, setNeedsAttention] = useState<NeedsAttention[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fg-admin/super-admin/gst-documents');
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data.invoices);
        setCreditNotes(data.data.creditNotes);
        setNeedsAttention(data.data.needsAttention);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const retryInvoice = async (bookingRef: string) => {
    setRetrying(bookingRef);
    try {
      const res = await fetch('/api/fg-admin/super-admin/gst-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_ref: bookingRef }),
      });
      const data = await res.json();
      if (data.success) {
        await load();
      } else {
        alert(data.message || 'Failed to issue invoice');
      }
    } finally {
      setRetrying(null);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-white/40">Loading...</div>;
  }

  return (
    <div className="space-y-12">
      {needsAttention.length > 0 && (
        <div className="glass-card !p-8 border-amber-500/30 bg-amber-500/[0.03]">
          <h2 className="text-lg font-black uppercase tracking-tighter italic text-amber-400 mb-4">
            Needs Attention — {needsAttention.length} paid booking{needsAttention.length !== 1 ? 's' : ''} missing an invoice
          </h2>
          <p className="text-xs text-white/40 mb-4">
            These bookings are paid/confirmed but a Tax Invoice failed to generate (likely a missing GST/place-of-supply setting).{readOnly ? ' Flag this to a super admin to fix.' : ' Fix the setting, then retry.'}
          </p>
          <div className="space-y-2">
            {needsAttention.map((b) => (
              <div key={b.booking_ref} className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02]">
                <div>
                  <span className="text-xs font-black text-white uppercase italic">{b.booking_ref}</span>
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest ml-3">{b.customer_name} · {b.payment_method} · ₹{b.total_amount}</span>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => retryInvoice(b.booking_ref)}
                    disabled={retrying === b.booking_ref}
                    className="btn-secondary !py-2 !px-4 !rounded-lg text-[10px] border-amber-500/30 text-amber-400"
                  >
                    {retrying === b.booking_ref ? 'RETRYING...' : 'RETRY'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card !p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-black uppercase tracking-tighter italic">Monthly Export</h2>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-bold outline-none focus:border-primary/50"
            />
            <a
              href={`/api/fg-admin/super-admin/gst-documents/export?month=${month}`}
              className="btn-primary !py-2 !px-6 !text-xs"
            >
              DOWNLOAD CSV
            </a>
          </div>
        </div>
        <p className="text-xs text-white/40">
          Hand this CSV (total invoices, credit notes, and net output tax liability) to your accountant each month for GSTR-1/3B reconciliation.
        </p>
      </div>

      <div className="glass-card !p-8">
        <h2 className="text-lg font-black uppercase tracking-tighter italic mb-6">Tax Invoices ({invoices.length})</h2>
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02]">
              <div>
                <span className="text-xs font-black text-primary uppercase italic">{inv.invoice_no}</span>
                <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest ml-3">
                  {inv.customer_name} · {new Date(inv.issue_datetime).toLocaleDateString('en-GB')} · Ref {inv.booking_ref}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-white">₹{Number(inv.gross_amount).toFixed(2)}</span>
                <a
                  href={`/api/fg-admin/super-admin/gst-documents/download?type=invoice&id=${inv.id}`}
                  className="btn-secondary !py-2 !px-4 !rounded-lg text-[10px]"
                >
                  DOWNLOAD
                </a>
              </div>
            </div>
          ))}
          {invoices.length === 0 && <p className="text-xs text-white/30 text-center py-8">No invoices yet.</p>}
        </div>
      </div>

      <div className="glass-card !p-8">
        <h2 className="text-lg font-black uppercase tracking-tighter italic mb-6">Credit Notes ({creditNotes.length})</h2>
        <div className="space-y-2">
          {creditNotes.map((cn) => (
            <div key={cn.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02]">
              <div>
                <span className="text-xs font-black text-orange-400 uppercase italic">{cn.note_no}</span>
                <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest ml-3">
                  Against {cn.linked_invoice_no} · {new Date(cn.issue_date).toLocaleDateString('en-GB')} · Ref {cn.booking_ref}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-white">₹{Number(cn.amount).toFixed(2)}</span>
                <a
                  href={`/api/fg-admin/super-admin/gst-documents/download?type=credit-note&id=${cn.id}`}
                  className="btn-secondary !py-2 !px-4 !rounded-lg text-[10px]"
                >
                  DOWNLOAD
                </a>
              </div>
            </div>
          ))}
          {creditNotes.length === 0 && <p className="text-xs text-white/30 text-center py-8">No credit notes yet.</p>}
        </div>
      </div>
    </div>
  );
}
