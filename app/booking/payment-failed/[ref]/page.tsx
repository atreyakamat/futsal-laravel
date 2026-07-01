import { getBookingsByRef, getArenaById } from '@/lib/domain';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ ref: string }>;
};

export const dynamic = 'force-dynamic';

export default async function BookingPaymentFailedPage({ params }: Props) {
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
        <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-inner animate-float">
          <span className="material-symbols-outlined text-red-500 text-6xl font-black">error</span>
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tighter italic text-red-500 uppercase text-stroke">
          FAILED!
        </h1>
        <p className="label-classic text-center text-red-400">
          Payment transaction could not be completed.
        </p>

        {/* Booking Summary */}
        <div className="mt-12 glass inline-block px-10 py-6 rounded-[2rem] border border-red-500/20 shadow-2xl shadow-red-500/5">
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
            <div className="w-px h-10 bg-red-500/20 hidden sm:block"></div>
            <div className="text-left">
              <span className="label-classic !ml-0 mb-1">Time Slots</span>
              <span className="font-black text-red-400 uppercase italic tracking-tight">{mergedSlots}</span>
            </div>
            <div className="w-px h-10 bg-red-500/20 hidden sm:block"></div>
            <div className="text-left">
              <span className="label-classic !ml-0 mb-1">Duration</span>
              <span className="font-black text-white uppercase italic tracking-tight">{duration}</span>
            </div>
            <div className="w-px h-10 bg-red-500/20 hidden sm:block"></div>
            <div className="text-left">
              <span className="label-classic !ml-0 mb-1">Amount Due</span>
              <span className="font-black text-white uppercase italic tracking-tight text-xl">₹{totalAmount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-16 max-w-5xl mx-auto">
        {/* Help Card */}
        <div className="glass-card relative overflow-hidden flex flex-col items-center !p-12 border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.05)]">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
            <span className="material-symbols-outlined text-[100px]">help_outline</span>
          </div>

          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-8">
            <span className="material-symbols-outlined text-red-500 text-4xl">lock_clock</span>
          </div>

          <div className="text-center space-y-4">
            <span className="label-classic !ml-0">Slots Locked</span>
            <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic">15-MIN TIMEOUT</h2>
            <p className="text-xs text-white/50 leading-relaxed font-medium">
              We have locked these slots for 15 minutes starting from when you checked out. You can retry the payment within this time window to lock in this booking.
            </p>
          </div>
        </div>

        {/* Retry actions */}
        <div className="space-y-10">
          <div className="glass-card !p-10 border-white/5 bg-white/[0.01]">
            <h3 className="text-xl font-black text-red-400 uppercase tracking-tighter mb-10 italic">
              What <span className="text-white">To Do?</span>
            </h3>
            <ul className="space-y-10">
              <li className="flex gap-8">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-black shrink-0 shadow-inner italic">
                  01
                </div>
                <div>
                  <p className="font-black text-sm mb-2 text-white uppercase tracking-tight">Try Again</p>
                  <p className="text-xs text-white/40 leading-relaxed font-medium">
                    Click the "RETRY PAYMENT" button below to reload the checkout forms and re-initiate the secure payment gateway.
                  </p>
                </div>
              </li>
              <li className="flex gap-8">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-black shrink-0 shadow-inner italic">
                  02
                </div>
                <div>
                  <p className="font-black text-sm mb-2 text-white uppercase tracking-tight">Check Bank Status</p>
                  <p className="text-xs text-white/40 leading-relaxed font-medium">
                    Ensure your payment credentials, card details, or UPI apps are active. Verify that no amount has been deducted.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            <Link
              href={`/payment/checkout/${bookingRef}`}
              className="btn-primary flex-1 text-center bg-red-500 hover:bg-red-600 text-black font-black py-4 px-6 rounded-full block tracking-widest text-xs uppercase"
            >
              RETRY PAYMENT
            </Link>
            <Link
              href="/"
              className="btn-secondary flex-1 text-center border-white/20 hover:border-white/40 text-white font-bold py-4 px-6 rounded-full block tracking-widest text-xs uppercase"
            >
              START OVER
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
