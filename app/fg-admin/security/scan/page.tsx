'use client';

import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

type BookingResult = {
  ticket_number: string;
  booking_ref: string;
  customer_name: string;
  booking_date: string;
  time_slot: string;
  arena_id: number;
  payment_status: string;
  checked_in: boolean;
  is_free_booking: boolean;
};

type VerifyResult =
  | { success: true; valid: boolean; already_checked_in: boolean; booking: BookingResult }
  | { success: false; message: string };

function SecurityScanContent() {
  const [ticketNumber, setTicketNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [scannerActive, setScannerActive] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const lastScanned = useRef('');
  const searchParams = useSearchParams();
  const deniedMessage = searchParams?.get('denied');

  const verifyTicket = useCallback(async (ticket: string) => {
    if (!ticket.trim() || loading) return;
    setLoading(true);
    setScannerActive(false);
    setResult(null);
    setCheckedIn(false);
    setTicketNumber(ticket.trim());
    try {
      const res = await fetch(`/api/fg-admin/security/verify/${encodeURIComponent(ticket.trim())}`, {
        method: 'GET',
      });
      const data: VerifyResult = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleQrScan = useCallback((scanResult: { rawValue: string }[]) => {
    if (scanResult && scanResult.length > 0) {
      const value = scanResult[0].rawValue;
      if (value && value !== lastScanned.current && !loading) {
        lastScanned.current = value;
        verifyTicket(value);
      }
    }
  }, [verifyTicket, loading]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) verifyTicket(manualInput);
  };

  const handleConfirmEntry = async () => {
    if (!ticketNumber || checkinLoading) return;
    setCheckinLoading(true);
    try {
      const formData = new FormData();
      formData.append('ticket_number', ticketNumber);
      const res = await fetch('/api/fg-admin/security/confirm-entry', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setCheckedIn(true);
        if (result && result.success && result.booking) {
          setResult({
            ...result,
            booking: { ...result.booking, checked_in: true },
            already_checked_in: true,
          } as VerifyResult);
        }
      }
    } catch {
      // handle error silently
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setTicketNumber('');
    setManualInput('');
    setScannerActive(true);
    lastScanned.current = '';
    setCheckedIn(false);
  };

  const booking = result?.success ? (result as any).booking as BookingResult : null;
  const isAlreadyCheckedIn = booking?.checked_in || checkedIn;
  const isValid = result?.success && (result as any).valid && !isAlreadyCheckedIn;
  const isInvalid = result && (!result.success || (result as any).booking?.payment_status !== 'confirmed');

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 pb-10 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4 border border-primary/20">
            <span className="material-symbols-outlined text-primary text-3xl">qr_code_scanner</span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">
            SECURITY <span className="text-primary text-stroke">PORTAL</span>
          </h1>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">
            Scan QR or enter ticket number
          </p>
        </div>

        {deniedMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest text-center">
            Access denied for this security action.
          </div>
        )}

        {/* Scanner + Manual input panel — show when no result yet */}
        {!result && !loading && (
          <div className="glass p-6 rounded-[2rem] border border-white/10 shadow-2xl shadow-black/50 space-y-6">
            {/* QR Scanner */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-white/10" style={{ height: '280px' }}>
              {scannerActive && (
                <Scanner
                  onScan={handleQrScan}
                  styles={{ container: { width: '100%', height: '100%' } }}
                />
              )}
              {/* Corner guides */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg pointer-events-none" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg pointer-events-none" />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">or enter manually</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Manual entry */}
            <form onSubmit={handleManualSubmit} className="flex gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-lg">confirmation_number</span>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white text-sm font-bold focus:outline-none focus:border-primary transition-all placeholder:text-white/20 uppercase"
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                  placeholder="TKT-XXXXXXXX-XXXX"
                />
              </div>
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="px-5 py-3.5 rounded-xl bg-primary text-black font-black text-sm tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">search</span>
                CHECK
              </button>
            </form>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="glass p-10 rounded-[2rem] border border-white/10 text-center space-y-4">
            <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">Verifying Ticket...</p>
            <p className="text-primary font-black italic uppercase">{ticketNumber}</p>
          </div>
        )}

        {/* Result Card */}
        {!loading && result && (
          <div className={`glass rounded-[2rem] border shadow-2xl overflow-hidden ${
            isAlreadyCheckedIn
              ? 'border-red-500/30 shadow-red-500/10'
              : isValid
              ? 'border-primary/30 shadow-primary/10'
              : 'border-red-500/30 shadow-red-500/10'
          }`}>
            {/* Status Banner */}
            <div className={`px-8 py-6 flex items-center gap-4 ${
              isAlreadyCheckedIn
                ? 'bg-red-500/10'
                : isValid
                ? 'bg-primary/10'
                : 'bg-red-500/10'
            }`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                isAlreadyCheckedIn
                  ? 'bg-red-500/20 border-red-500/30 text-red-500'
                  : isValid
                  ? 'bg-primary/20 border-primary/30 text-primary'
                  : 'bg-red-500/20 border-red-500/30 text-red-500'
              }`}>
                <span className="material-symbols-outlined text-3xl font-black">
                  {isAlreadyCheckedIn ? 'block' : isValid ? 'verified' : 'cancel'}
                </span>
              </div>
              <div>
                <p className={`text-2xl font-black uppercase italic tracking-tight ${
                  isAlreadyCheckedIn ? 'text-red-400' : isValid ? 'text-primary' : 'text-red-400'
                }`}>
                  {isAlreadyCheckedIn ? 'ALREADY CHECKED IN' : isValid ? 'VALID TICKET ✓' : 'INVALID TICKET ✗'}
                </p>
                {!result.success && (
                  <p className="text-white/60 text-xs mt-0.5">{(result as any).message}</p>
                )}
              </div>
            </div>

            {/* Booking Details */}
            {booking && (
              <div className="px-8 py-6 space-y-5">
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Player Name</span>
                  <p className="text-2xl font-black text-white uppercase italic mt-0.5">{booking.customer_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Ticket #</span>
                    <p className="text-sm font-black text-primary italic mt-0.5">{booking.ticket_number}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Ref</span>
                    <p className="text-sm font-black text-white/80 italic mt-0.5">{booking.booking_ref}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Date</span>
                    <p className="text-sm font-black text-white italic mt-0.5">
                      {new Date(booking.booking_date).toLocaleDateString('en-IN', {
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Time Slot</span>
                    <p className="text-sm font-black text-white italic mt-0.5">{booking.time_slot}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Payment</span>
                    <span className={`inline-block mt-0.5 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
                      booking.payment_status === 'confirmed'
                        ? 'text-primary border-primary/30 bg-primary/10'
                        : 'text-red-400 border-red-500/30 bg-red-500/10'
                    }`}>
                      {booking.payment_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Type</span>
                    <span className={`inline-block mt-0.5 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
                      booking.is_free_booking
                        ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                        : 'text-white/60 border-white/10 bg-white/5'
                    }`}>
                      {booking.is_free_booking ? 'Free Entry' : 'Paid'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  {isValid && !checkedIn && (
                    <button
                      onClick={handleConfirmEntry}
                      disabled={checkinLoading}
                      className="w-full py-4 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-primary/30 disabled:opacity-60"
                    >
                      {checkinLoading ? (
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined font-black">login</span>
                      )}
                      {checkinLoading ? 'CONFIRMING...' : 'CONFIRM PLAYER ENTRY'}
                    </button>
                  )}

                  {checkedIn && (
                    <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center">
                      <span className="material-symbols-outlined text-primary text-2xl block mb-1">check_circle</span>
                      <p className="text-primary font-black uppercase tracking-widest text-xs">Entry Confirmed!</p>
                    </div>
                  )}

                  {isAlreadyCheckedIn && !checkedIn && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center animate-pulse">
                      <p className="text-red-400 font-black uppercase tracking-widest text-xs">
                        This ticket has already been used for entry.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleReset}
                    className="w-full py-3.5 rounded-2xl border border-white/10 text-white/60 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                    SCAN NEXT TICKET
                  </button>
                </div>
              </div>
            )}

            {/* Error with no booking */}
            {!booking && !result.success && (
              <div className="px-8 py-6">
                <button
                  onClick={handleReset}
                  className="w-full py-3.5 rounded-2xl border border-white/10 text-white/60 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                  TRY AGAIN
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SecurityScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-primary text-xs font-black tracking-widest uppercase">LOADING...</div>}>
      <SecurityScanContent />
    </Suspense>
  );
}