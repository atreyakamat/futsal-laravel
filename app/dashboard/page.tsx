import { getBookingsForUser, getArenaById } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const userId = await readAuthUserId();

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-black uppercase mb-4">Sign in to see your bookings</h1>
        <Link href="/login" className="px-8 py-4 bg-primary text-black rounded-full font-black text-xs tracking-widest hover:scale-105 transition-all inline-block">
          GO TO LOGIN
        </Link>
      </div>
    );
  }

  const allBookings = await getBookingsForUser(userId);
  
  // Group by booking_ref
  const groups: Record<string, typeof allBookings> = {};
  for (const b of allBookings) {
    const ref = b.booking_ref || 'LEGACY';
    if (!groups[ref]) groups[ref] = [];
    groups[ref].push(b);
  }

  // Pre-fetch arena names
  const arenaCache: Record<number, { name: string }> = {};
  for (const b of allBookings) {
    if (!arenaCache[b.arena_id]) {
      const arena = await getArenaById(b.arena_id);
      if (arena) arenaCache[b.arena_id] = arena;
    }
  }

  const bookingRefs = Object.keys(groups);

  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic mb-4">
            MY <span className="text-primary">BOOKINGS</span>
          </h1>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
            History of your arena reservations
          </p>
        </div>
        <div className="glass px-6 py-4 rounded-3xl">
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] block mb-1">
            Total Groups
          </span>
          <span className="text-2xl font-black text-white italic">{bookingRefs.length}</span>
        </div>
      </div>

      {bookingRefs.length === 0 ? (
        <div className="py-32 text-center glass rounded-[3rem] border-dashed border-white/10">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-gray-700">history</span>
          </div>
          <h2 className="text-xl font-bold uppercase mb-2 tracking-tight">No bookings found</h2>
          <p className="text-gray-500 text-sm mb-8">You haven't made any reservations yet. Ready to play?</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black rounded-full font-black text-xs tracking-widest hover:scale-105 transition-all"
          >
            BROWSE ARENAS
            <span className="material-symbols-outlined text-sm font-black">arrow_forward</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {bookingRefs.map((ref) => {
            const group = groups[ref];
            const slots = group.map((b) => b.time_slot);
            const mergedSlots = mergeSlots(slots).join(', ');
            const duration = getDurationText(slots);
            const totalAmount = group.reduce((sum, b) => sum + Number(b.amount), 0);
            const firstBooking = group[0];
            const arenaName = arenaCache[firstBooking.arena_id]?.name || 'Arena';

            return (
              <div
                key={ref}
                className="glass rounded-[2.5rem] border border-white/10 overflow-hidden group hover:border-primary/30 transition-all duration-500"
              >
                <div className="p-8 md:p-10">
                  <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="space-y-6 flex-1">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-2xl">stadium</span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">
                            {arenaName}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                              Reference
                            </span>
                            <span className="text-[10px] font-black text-white px-2 py-0.5 rounded bg-white/5 border border-white/5">
                              {ref}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-white/5">
                        <div>
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-1">
                            Date
                          </span>
                          <span className="text-sm font-bold text-white">
                            {new Date(firstBooking.booking_date).toLocaleDateString('en-GB', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-1">
                            Time Slots
                          </span>
                          <span className="text-sm font-bold text-primary">{mergedSlots}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-1">
                            Duration
                          </span>
                          <span className="text-sm font-bold text-white">{duration}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-1">
                            Status
                          </span>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                              firstBooking.payment_status === 'confirmed'
                                ? 'bg-primary/20 text-primary border border-primary/20'
                                : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20'
                            }`}
                          >
                            {firstBooking.payment_status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-white/5 pt-8 md:pt-0 md:pl-10">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-1">
                          Total Paid
                        </span>
                        <span className="text-3xl font-black text-white italic tracking-tighter">
                          ₹{totalAmount}
                        </span>
                      </div>

                      <Link
                        href={`/booking/success/${ref}`}
                        className="mt-6 inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold text-[10px] tracking-[0.2em] hover:bg-primary hover:text-black hover:border-primary transition-all group/btn"
                      >
                        VIEW TICKET
                        <span className="material-symbols-outlined text-lg group-hover/btn:translate-y-0.5 transition-transform">
                          confirmation_number
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
