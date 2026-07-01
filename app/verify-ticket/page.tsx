import { getBookingByTicket, getArenaById } from '@/lib/domain';
import Link from 'next/link';

type Props = {
  searchParams: Promise<{ ticket?: string }>;
};

export const dynamic = 'force-dynamic';

export default async function VerifyTicketPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const ticketNumber = resolvedSearchParams.ticket;

  if (!ticketNumber) {
    return (
      <div className="max-w-md mx-auto mt-20 px-6 py-20 text-center">
        <div className="glass-card">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto mb-6">
            <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
          </div>
          <h1 className="text-3xl font-black uppercase mb-4 italic">No Ticket Code</h1>
          <p className="text-white/40 mb-8 uppercase text-[9px] tracking-widest font-black">Please scan a valid QR code or provide a ticket number.</p>
          <Link href="/" className="btn-secondary w-full block text-center">Back to Home</Link>
        </div>
      </div>
    );
  }

  const booking = await getBookingByTicket(ticketNumber);

  if (!booking) {
    return (
      <div className="max-w-md mx-auto mt-20 px-6 py-20 text-center">
        <div className="glass-card">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto mb-6">
            <span className="material-symbols-outlined text-red-500 text-3xl">cancel</span>
          </div>
          <h1 className="text-3xl font-black uppercase mb-2 italic">Invalid Ticket</h1>
          <span className="text-red-400 font-black block mb-6 uppercase text-[9px] tracking-widest font-mono">{ticketNumber}</span>
          <p className="text-white/40 mb-8 uppercase text-[9px] tracking-widest font-black">This ticket number could not be found in our records.</p>
          <Link href="/" className="btn-secondary w-full block text-center">Back to Home</Link>
        </div>
      </div>
    );
  }

  const arena = await getArenaById(booking.arena_id);
  const isConfirmed = booking.payment_status === 'confirmed';
  const isCheckedIn = !!booking.checked_in;

  return (
    <div className="max-w-md mx-auto mt-20 px-6 py-12">
      <div className="glass-card space-y-8 relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary to-accent-cyan" />

        <div className="text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-1">
            Ticket <span className="text-primary text-stroke">Verification</span>
          </h1>
          <p className="label-classic !ml-0 uppercase tracking-widest text-[9px] text-white/30">Official Ticket Verification Portal</p>
        </div>

        {/* Verification Status Badge */}
        <div className="flex flex-col items-center justify-center py-6 border-y border-white/5 space-y-3">
          {isCheckedIn ? (
            <>
              <span className="material-symbols-outlined text-yellow-500 text-5xl animate-pulse">lock</span>
              <span className="px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-black text-[10px] uppercase tracking-widest">
                Already Checked In
              </span>
            </>
          ) : isConfirmed ? (
            <>
              <span className="material-symbols-outlined text-primary text-5xl">check_circle</span>
              <span className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-black text-[10px] uppercase tracking-widest">
                Valid Ticket
              </span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
              <span className="px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-black text-[10px] uppercase tracking-widest">
                Unconfirmed Ticket ({booking.payment_status})
              </span>
            </>
          )}
        </div>

        {/* Ticket Metadata Box */}
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="label-classic !ml-0 mb-1">Ticket Number</span>
            <span className="font-mono font-black text-white text-base tracking-wider block">{booking.ticket_number}</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="label-classic !ml-0 mb-1">Customer Details</span>
            <span className="font-black text-white uppercase italic text-sm block">{booking.customer_name}</span>
            <span className="text-[10px] text-white/50 block font-bold mt-0.5">{booking.customer_mobile}</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="label-classic !ml-0 mb-1">Arena Venue</span>
            <span className="font-black text-white uppercase italic text-sm block">{arena?.name || 'Futsal Arena'}</span>
            <span className="text-[9px] text-white/40 block font-black mt-1 uppercase tracking-widest">{arena?.address || 'Assagao, Goa'}</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="label-classic !ml-0 mb-1">Date & Time Slot</span>
            <span className="font-black text-white uppercase italic text-sm block">
              {new Date(booking.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="font-mono text-primary font-black tracking-widest text-xs uppercase block mt-1">{booking.time_slot}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-white/5 space-y-4">
          <a
            href={`/api/bookings/download?ticket=${booking.ticket_number}`}
            className="btn-primary w-full text-center py-4 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm font-black">download</span>
            DOWNLOAD TICKET PDF
          </a>
          <Link href="/" className="btn-secondary w-full text-center py-4 block">
            BACK TO HOME
          </Link>
        </div>
      </div>
    </div>
  );
}
