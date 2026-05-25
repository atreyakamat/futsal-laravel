import { getBookingsByRef, getArenaById } from '@/lib/domain';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ ref: string }>;
};

export default async function BookingSuccessPage({ params }: Props) {
  const { ref: bookingRef } = await params;
  const bookings = await getBookingsByRef(bookingRef);

  if (bookings.length === 0) {
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
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
          <span className="material-symbols-outlined text-primary text-5xl font-black">check_circle</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter italic text-primary uppercase">
          BOOKING CONFIRMED!
        </h1>
        <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">
          Your slot at {arena.name} is now yours.
        </p>

        {/* Booking Summary */}
        <div className="mt-8 glass inline-block px-8 py-4 rounded-2xl border border-primary/30">
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
            <div className="text-left">
              <span className="text-gray-600 text-[10px] tracking-widest uppercase block">Date</span>
              <span className="font-bold text-white">
                {new Date(firstBooking.booking_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="w-px h-8 bg-primary/30 hidden sm:block"></div>
            <div className="text-left">
              <span className="text-gray-600 text-[10px] tracking-widest uppercase block">Time</span>
              <span className="font-bold text-primary">{mergedSlots}</span>
            </div>
            <div className="w-px h-8 bg-primary/30 hidden sm:block"></div>
            <div className="text-left">
              <span className="text-gray-600 text-[10px] tracking-widest uppercase block">Duration</span>
              <span className="font-bold text-white">{duration}</span>
            </div>
            <div className="w-px h-8 bg-primary/30 hidden sm:block"></div>
            <div className="text-left">
              <span className="text-gray-600 text-[10px] tracking-widest uppercase block">Total</span>
              <span className="font-bold text-white">₹{totalAmount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
        {/* Ticket Card */}
        <div className="glass p-10 rounded-[3rem] border border-primary/20 relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 right-0 p-10 opacity-5">
            <span className="material-symbols-outlined text-8xl">qr_code_2</span>
          </div>

          <div className="bg-white p-6 rounded-3xl mb-8 shadow-2xl shadow-primary/30">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${firstBooking.ticket_number}`}
              alt="Ticket QR"
              className="w-48 h-48"
            />
          </div>

          <div className="text-center space-y-2">
            <span className="text-gray-600 font-bold uppercase tracking-[0.3em] text-[10px]">Ticket Number</span>
            <h2 className="text-3xl font-black tracking-tight text-white">{firstBooking.ticket_number}</h2>
            <div className="pt-4 flex justify-center">
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${firstBooking.ticket_number}`}
                download="futsalgoa-ticket.png"
                className="flex items-center gap-2 px-6 py-2 glass rounded-full text-[10px] font-bold tracking-widest hover:bg-primary hover:text-black transition-all"
              >
                <span className="material-symbols-outlined text-sm">download</span> DOWNLOAD QR
              </a>
            </div>
          </div>
        </div>

        {/* Details List */}
        <div className="space-y-8">
          <div className="glass p-8 rounded-[2rem] border border-white/5">
            <h3 className="font-black text-xs text-primary uppercase tracking-widest mb-8 italic underline decoration-primary decoration-4 underline-offset-8">
              Next Steps
            </h3>
            <ul className="space-y-8">
              <li className="flex gap-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">
                  01
                </div>
                <div>
                  <p className="font-bold text-sm mb-1 text-white">Check Your Phone/Email</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    We've sent your digital ticket via WhatsApp and Email. Keep it safe!
                  </p>
                </div>
              </li>
              <li className="flex gap-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">
                  02
                </div>
                <div>
                  <p className="font-bold text-sm mb-1 text-white">Show QR at Entry</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Present the QR code above or the one in your WhatsApp message at the arena security desk.
                  </p>
                </div>
              </li>
              <li className="flex gap-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">
                  03
                </div>
                <div>
                  <p className="font-bold text-sm mb-1 text-white">Play Your Match</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Get your gear ready and enjoy your game at {arena.name}.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="flex gap-4">
            <Link
              href="/"
              className="flex-1 py-5 bg-primary text-black rounded-2xl font-black text-xs tracking-widest text-center shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              BOOK ANOTHER
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 py-5 glass text-white rounded-2xl font-black text-xs tracking-widest text-center hover:bg-white/5 transition-all"
            >
              MY BOOKINGS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
