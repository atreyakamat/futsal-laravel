import { getBookingsByRef, getArenaById, ensureSchemaColumns } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';
import { evaluateRescheduleEligibility, getMaxRescheduleDate, RESCHEDULE_MAX_WINDOW_DAYS } from '@/lib/refund-policy';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import RescheduleForm from '@/components/RescheduleForm';

type Props = {
  params: Promise<{ ref: string }>;
};

export const dynamic = 'force-dynamic';

function IneligiblePage({ title, message, bookingRef }: { title: string; message: string; bookingRef: string }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-10">
        <span className="material-symbols-outlined text-white/40 text-6xl font-black">event_busy</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-black mb-4 tracking-tighter italic uppercase">{title}</h1>
      <p className="text-white/50 mb-10">{message}</p>
      <div className="flex gap-6 justify-center">
        <Link href="/dashboard" className="btn-primary px-8 text-center">BACK TO MY BOOKINGS</Link>
      </div>
    </div>
  );
}

export default async function ReschedulePage({ params }: Props) {
  const { ref } = await params;
  const userId = await readAuthUserId();
  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/reschedule/${ref}`)}`);
  }

  await ensureSchemaColumns();
  const bookings = await getBookingsByRef(ref);
  if (!bookings || bookings.length === 0 || bookings[0].user_id !== userId) {
    return <IneligiblePage title="Booking Not Found" message="We couldn't find this booking on your account." bookingRef={ref} />;
  }

  const firstBooking = bookings[0];
  const oldSlots = bookings.map((b) => b.time_slot);
  const oldTotal = bookings.reduce((sum, b) => sum + Number(b.amount), 0);

  const eligibility = evaluateRescheduleEligibility(
    firstBooking.booking_date,
    oldSlots,
    Date.now(),
    Boolean(firstBooking.reschedule_used),
    firstBooking.payment_status
  );

  if (!eligibility.allowed) {
    return <IneligiblePage title="Can't Reschedule This Booking" message={eligibility.message} bookingRef={ref} />;
  }

  const arena = await getArenaById(firstBooking.arena_id);
  if (!arena) {
    return <IneligiblePage title="Arena Not Found" message="This booking's arena is no longer available." bookingRef={ref} />;
  }

  const maxDate = getMaxRescheduleDate(firstBooking.booking_date);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-20">
      <div className="flex items-center gap-4 sm:gap-6 mb-8 sm:mb-12">
        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner flex-shrink-0">
          <span className="material-symbols-outlined text-2xl sm:text-3xl">event_repeat</span>
        </div>
        <div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter italic">
            RESCHEDULE <span className="text-primary text-stroke">BOOKING</span>
          </h1>
          <p className="label-classic">{arena.name}</p>
        </div>
      </div>

      <div className="glass-card !p-6 sm:!p-8 mb-8 space-y-3">
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Current Booking</p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div><span className="text-white/40">Reference:</span> <span className="font-black text-white">{ref}</span></div>
          <div><span className="text-white/40">Date:</span> <span className="font-black text-white">{new Date(firstBooking.booking_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
          <div><span className="text-white/40">Slots:</span> <span className="font-black text-primary">{mergeSlots(oldSlots).join(', ')}</span> <span className="text-white/40">({getDurationText(oldSlots)})</span></div>
          <div><span className="text-white/40">Total Paid:</span> <span className="font-black text-white">₹{oldTotal}</span></div>
        </div>
      </div>

      <div className="mb-8 p-4 sm:p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-300 text-xs sm:text-sm font-medium leading-relaxed">
        Pick <strong className="text-white">{oldSlots.length}</strong> contiguous slot{oldSlots.length > 1 ? 's' : ''} on one date, within the next {RESCHEDULE_MAX_WINDOW_DAYS} days, totalling <strong className="text-white">₹{oldTotal} or less</strong>. This is a one-time move — no refund is issued, and this booking cannot be rescheduled again once confirmed.
      </div>

      <RescheduleForm
        bookingRef={ref}
        arenaId={arena.id}
        requiredSlotCount={oldSlots.length}
        oldTotal={oldTotal}
        minDate={todayStr}
        maxDate={maxDate}
        initialDate={firstBooking.booking_date}
      />
    </div>
  );
}
