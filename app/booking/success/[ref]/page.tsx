import { getBookingsByRef, getArenaById } from '@/lib/domain';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTicketQrUrl } from '@/lib/ticket';

type Props = {
  params: Promise<{ ref: string }>;
};

export const dynamic = 'force-dynamic';

export default async function BookingSuccessPage({ params }: Props) {
  const { ref: bookingRef } = await params;
  const bookings = await getBookingsByRef(bookingRef);

  if (!bookings || bookings?.length === 0) {
    redirect('/');
  }

  const firstBooking = bookings[0];
  const arena = await getArenaById(firstBooking.arena_id);
  if (!arena) redirect('/');

  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0);
  const slots = bookings.map((b) => b.time_slot);
  const mergedSlots = mergeSlots(slots).join(', ');
  const duration = getDurationText(slots);

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <div className="w-24 h-24 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-inner animate-float">
          <span className="material-symbols-outlined text-primary text-6xl font-black">check_circle</span>
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tighter italic text-primary uppercase text-stroke">
          CONFIRMED!
        </h1>
        <p className="label-classic text-center">
          Your pitch at {arena.name} is reserved.
        </p>

        {/* Booking Summary */}
        <div className="mt-12 glass inline-block px-10 py-6 rounded-[2rem] border border-primary/20 shadow-2xl shadow-primary/5">
          <div className="flex flex-wrap justify-center items-center gap-10 text-sm">
            <div className="text-left">
              <span className="label-classic !ml-0 mb-1">Date</span>
              <span className="font-black text-white uppercase italic tracking-tight">
                {new Date(firstBooking.booking_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
            </div>
            <div className="w-px h-10 bg-primary/20 hidden sm:block"></div>
            <div className="text-left">
              <span className="label-classic !ml-0 mb-1">Time Slots</span>
              <span className="font-black text-primary uppercase italic tracking-tight">{mergedSlots}</span>
            </div>
            <div className="w-px h-10 bg-primary/20 hidden sm:block"></div>
            <div className="text-left">
              <span className="label-classic !ml-0 mb-1">Duration</span>
              <span className="font-black text-white uppercase italic tracking-tight">{duration}</span>
            </div>
            <div className="w-px h-10 bg-primary/20 hidden sm:block"></div>
            <div className="text-left">
              <span className="label-classic !ml-0 mb-1">Paid Amount</span>
              <span className="font-black text-white uppercase italic tracking-tight text-xl">₹{totalAmount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-16 max-w-5xl mx-auto">
        {/* Ticket Card */}
        <div className="glass-card relative overflow-hidden flex flex-col items-center !p-12">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
            <span className="material-symbols-outlined text-[100px]">qr_code_2</span>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] mb-10 shadow-[0_0_50px_rgba(13,242,32,0.1)] scale-110">
            <img
              src={getTicketQrUrl(firstBooking.ticket_number ?? bookingRef)}
              alt="Ticket QR"
              className="w-40 h-40"
            />
          </div>

          <div className="text-center space-y-4">
            <span className="label-classic !ml-0">Access Ticket</span>
            <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">{firstBooking.ticket_number}</h2>
            <div className="pt-6 flex justify-center">
              <a
                href={`/booking/ticket/${bookingRef}?download=1`}
                className="btn-secondary !py-3 !px-6 !rounded-full !text-[10px] flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-lg">download</span> DOWNLOAD TICKET
              </a>
            </div>
          </div>
        </div>

        {/* Details List */}
        <div className="space-y-10">
          <div className="glass-card !p-10 border-white/5 bg-white/[0.01]">
            <h3 className="text-xl font-black text-primary uppercase tracking-tighter mb-10 italic">
              Next <span className="text-white">Steps</span>
            </h3>
            <ul className="space-y-10">
              <li className="flex gap-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black shrink-0 shadow-inner italic">
                  01
                </div>
                <div>
                  <p className="font-black text-sm mb-2 text-white uppercase tracking-tight">Check Your Messages</p>
                  <p className="text-xs text-white/40 leading-relaxed font-medium">
                    Your digital ticket is ready to download and email delivery will use the configured mail gateway.
                  </p>
                </div>
              </li>
              <li className="flex gap-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black shrink-0 shadow-inner italic">
                  02
                </div>
                <div>
                  <p className="font-black text-sm mb-2 text-white uppercase tracking-tight">Show QR at Entry</p>
                  <p className="text-xs text-white/40 leading-relaxed font-medium">
                    Present the QR code above or the downloaded ticket at the arena security desk.
                  </p>
                </div>
              </li>
              <li className="flex gap-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black shrink-0 shadow-inner italic">
                  03
                </div>
                <div>
                  <p className="font-black text-sm mb-2 text-white uppercase tracking-tight">Game Time</p>
                  <p className="text-xs text-white/40 leading-relaxed font-medium">
                    Arrive 10 minutes early to gear up and make the most of your session at {arena.name}.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="flex gap-6">
            <Link
              href="/"
              className="btn-primary flex-1 text-center"
            >
              BOOK AGAIN
            </Link>
            <Link
              href="/dashboard"
              className="btn-secondary flex-1 text-center"
            >
              MY BOOKINGS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
