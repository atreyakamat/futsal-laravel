import { getSecurityBookings } from '@/lib/domain';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export default async function SecurityVerifyPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const ticketNumber = typeof resolvedSearchParams.ticket_number === 'string' ? resolvedSearchParams.ticket_number : '';

  if (!ticketNumber) {
    return (
      <div className="max-w-md mx-auto mt-20 px-6 py-20">
        <div className="glass p-10 rounded-[2.5rem] border border-white/10 text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-yellow-500 text-3xl">warning</span>
          </div>
          <p className="text-lg font-bold text-gray-400">Provide a ticket number from the scan screen.</p>
        </div>
      </div>
    );
  }

  const bookings = await getSecurityBookings(ticketNumber);

  if (bookings.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-20 px-6 py-20">
        <div className="glass p-10 rounded-[2.5rem] border border-white/10 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-red-500 text-3xl">close</span>
          </div>
          <p className="text-lg font-bold text-red-400">Invalid ticket number.</p>
        </div>
      </div>
    );
  }

  const booking = bookings[0];
  const isCheckedIn = booking.checked_in;

  return (
    <div className="max-w-2xl mx-auto px-6 py-20">
      <div className="glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`material-symbols-outlined text-4xl ${isCheckedIn ? 'text-red-500' : 'text-primary'}`}>
            {isCheckedIn ? 'check_circle' : 'verified'}
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            {isCheckedIn ? <span className="text-red-500">Already Checked In</span> : <span className="text-primary">Ticket Verified</span>}
          </h1>
        </div>

        <div className="space-y-6 mb-10 p-6 bg-white/5 rounded-2xl border border-white/10">
          <div>
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Name</span>
            <span className="text-2xl font-black text-white uppercase tracking-tighter">{booking.customer_name}</span>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
            <div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Ticket</span>
              <span className="text-sm font-bold text-primary">{booking.ticket_number}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Date</span>
              <span className="text-sm font-bold text-white">{booking.booking_date}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Time</span>
              <span className="text-sm font-bold text-white">{booking.time_slot}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Status</span>
              <span className={`text-sm font-bold ${isCheckedIn ? 'text-red-400' : 'text-primary'}`}>
                {isCheckedIn ? 'CHECKED IN' : 'PENDING'}
              </span>
            </div>
          </div>
        </div>

        {!isCheckedIn && (
          <form className="space-y-4" action="/api/security/confirm-entry" method="post">
            <input type="hidden" name="ticket_number" value={ticketNumber} />
            <button
              className="w-full py-6 rounded-2xl font-black text-sm tracking-widest bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
              type="submit"
            >
              <span className="material-symbols-outlined">check_circle</span>
              CONFIRM ENTRY
            </button>
          </form>
        )}

        {isCheckedIn && (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center">
            <p className="text-red-400 font-bold uppercase tracking-widest text-sm">
              This ticket has already been checked in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}