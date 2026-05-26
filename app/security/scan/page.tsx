'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SecurityScanPage() {
  const [ticketNumber, setTicketNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketNumber) return;
    
    setLoading(true);
    router.push(`/security/verify?ticket_number=${encodeURIComponent(ticketNumber)}`);
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-6 py-20">
      <div className="glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-6">
          <span className="material-symbols-outlined text-primary text-3xl">qr_code_scanner</span>
        </div>
        <h2 className="text-3xl font-black mb-2 text-center uppercase tracking-tighter italic">
          SECURITY <span className="text-primary">PORTAL</span>
        </h2>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-8">
          Scan or enter ticket number
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1" htmlFor="ticket_number">
              Ticket Number
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg">
                confirmation_number
              </span>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-800 uppercase font-bold"
                id="ticket_number"
                type="text"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="TKT-XXXXXXXX-XXXX"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !ticketNumber}
            className="w-full py-5 rounded-2xl font-black text-sm tracking-widest bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                VERIFY TICKET
                <span className="material-symbols-outlined text-sm font-black">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest">
            💡 Scan the QR code on the ticket or enter the ticket number manually.
          </p>
        </div>
      </div>
    </div>
  );
}