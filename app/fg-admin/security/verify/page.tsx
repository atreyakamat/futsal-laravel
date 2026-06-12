import { getSecurityBookings } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import { getAdminContext, userHasSecurityPermission } from '@/lib/admin';
import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export default async function SecurityVerifyPage({ searchParams }: Props) {
  const userId = await readAuthUserId();
  const context = await getAdminContext(userId);
  if (!context) {
    redirect('/fg-admin/platform/login');
  }

  if (context.role === 'security') {
    const canVerify = await userHasSecurityPermission(context.id, 'canVerifyTicket');
    if (!canVerify) {
      redirect('/fg-admin/security/scan?denied=verify');
    }
  }

  const resolvedSearchParams = await searchParams;
  const ticketNumber = typeof resolvedSearchParams.ticket_number === 'string' ? resolvedSearchParams.ticket_number : '';

  if (!ticketNumber) {
    return (
      <div className="max-w-md mx-auto mt-20 px-6 py-20">
        <div className="glass-card text-center">
          <div className="w-20 h-20 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-8">
            <span className="material-symbols-outlined text-yellow-500 text-4xl">warning</span>
          </div>
          <p className="text-xl font-black uppercase italic tracking-tight text-white/40 leading-tight">Provide a ticket number from the scan screen.</p>
        </div>
      </div>
    );
  }

  const bookings = await getSecurityBookings(ticketNumber);

  if (!bookings || bookings?.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-20 px-6 py-20">
        <div className="glass-card text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
            <span className="material-symbols-outlined text-red-500 text-4xl">close</span>
          </div>
          <p className="text-xl font-black uppercase italic tracking-tight text-red-400 leading-tight">Invalid ticket number.</p>
        </div>
      </div>
    );
  }

  const booking = bookings[0];
  if (context.role === 'security' && context.arenaId && booking.arena_id !== context.arenaId) {
    redirect('/fg-admin/security/scan?denied=arena');
  }
  const isCheckedIn = booking.checked_in;

  return (
    <div className="max-w-2xl mx-auto px-6 py-20">
      <div className="glass-card shadow-2xl shadow-black/50">
        <div className="flex flex-col items-center gap-4 mb-12">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border ${isCheckedIn ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-primary/10 border-primary/20 text-primary'} shadow-inner`}>
            <span className="material-symbols-outlined text-4xl font-black">
              {isCheckedIn ? 'block' : 'verified'}
            </span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic text-center leading-none">
            {isCheckedIn ? <span className="text-red-500 text-stroke">STRIKE! ALREADY IN</span> : <span className="text-primary text-stroke">TICKET VERIFIED</span>}
          </h1>
        </div>

        <div className="space-y-8 mb-12 p-8 bg-white/[0.02] rounded-3xl border border-white/5">
          <div>
            <span className="label-classic !ml-0 mb-2">Player Name</span>
            <span className="text-3xl font-black text-white uppercase tracking-tighter italic">{booking.customer_name}</span>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
            <div>
              <span className="label-classic !ml-0 mb-2">Ticket #</span>
              <span className="text-sm font-black text-primary uppercase italic">{booking.ticket_number}</span>
            </div>
            <div>
              <span className="label-classic !ml-0 mb-2">Match Date</span>
              <span className="text-sm font-black text-white uppercase italic">{booking.booking_date}</span>
            </div>
            <div>
              <span className="label-classic !ml-0 mb-2">Time Slot</span>
              <span className="text-sm font-black text-white uppercase italic">{booking.time_slot}</span>
            </div>
            <div>
              <span className="label-classic !ml-0 mb-2">Check-in Status</span>
              <span className={`pill-status ${isCheckedIn ? 'border-red-500/20 text-red-500' : 'border-primary/20 text-primary'}`}>
                {isCheckedIn ? 'CHECKED IN' : 'ELIGIBLE'}
              </span>
            </div>
          </div>
        </div>

        {!isCheckedIn && (
          <form className="space-y-4" action="/api/security/confirm-entry" method="post">
            <input type="hidden" name="ticket_number" value={ticketNumber} />
            <button
              className="btn-primary w-full py-6 flex items-center justify-center gap-4 scale-105"
              type="submit"
            >
              <span className="material-symbols-outlined font-black">login</span>
              CONFIRM PLAYER ENTRY
            </button>
          </form>
        )}

        {isCheckedIn && (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center animate-pulse">
            <p className="text-red-400 font-black uppercase tracking-[0.2em] text-xs">
              This ticket has already been used for entry.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}