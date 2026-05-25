import { getArenaById, getArenaPricing, findUserByIdentifier } from '@/lib/domain';
import { readAuthUserId, readGuestIdentifier } from '@/lib/session';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';
import Link from 'next/link';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const arenaId = Number(resolvedSearchParams.arena_id);
  const date = typeof resolvedSearchParams.date === 'string' ? resolvedSearchParams.date : '';
  const slotsJson = typeof resolvedSearchParams.slots === 'string' ? resolvedSearchParams.slots : '[]';
  const slots: string[] = JSON.parse(slotsJson);

  if (!arenaId || !date || slots.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-black uppercase">Invalid checkout session.</h1>
        <Link href="/" className="text-primary mt-4 inline-block font-bold">Back to Home</Link>
      </div>
    );
  }

  const arena = await getArenaById(arenaId);
  if (!arena) return <div>Arena not found.</div>;

  const pricing = await getArenaPricing(arenaId);
  const selectedPricing = pricing.filter((p) => slots.includes(p.time_slot));
  const total = selectedPricing.reduce((sum, p) => sum + Number(p.price), 0);

  const userId = await readAuthUserId();
  const guestIdentifier = await readGuestIdentifier();
  let defaultUser = null;

  if (userId) {
    // Fetch logged in user details if needed, but let's assume they fill it or we can pre-fill
    // For now, let's keep it simple as per Laravel checkout
  } else if (guestIdentifier) {
    // Pre-fill with guest identifier (email or mobile)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">shield_lock</span>
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">
            SECURE <span className="text-primary">CHECKOUT</span>
          </h1>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
            Complete your booking for {arena.name}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-16">
        {/* Booking Details */}
        <div className="lg:col-span-5 space-y-8">
          <div className="glass p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <span className="material-symbols-outlined text-8xl">receipt_long</span>
            </div>

            <h2 className="font-black text-sm mb-8 text-primary uppercase tracking-[0.2em]">Reservation Details</h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl glass flex items-center justify-center text-gray-500">
                  <span className="material-symbols-outlined text-lg">stadium</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block">Arena</span>
                  <span className="text-lg font-bold text-white">{arena.name}</span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl glass flex items-center justify-center text-gray-500">
                  <span className="material-symbols-outlined text-lg">calendar_today</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block">Date</span>
                  <span className="text-lg font-bold text-white">
                    {new Date(date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block">
                    Selected Duration
                  </span>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">
                    {getDurationText(slots)}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Time Slots</span>
                    <span className="text-lg font-black text-white italic tracking-tighter">
                      {mergeSlots(slots).join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex justify-between items-end">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Total to Pay</span>
                <span className="text-4xl font-black text-white italic">₹{total}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 glass rounded-2xl border-primary/20 bg-primary/5">
            <span className="material-symbols-outlined text-primary text-lg">timer</span>
            <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest leading-relaxed">
              These slots are temporarily locked for your session. Complete the booking within{' '}
              <span className="text-white">10 minutes</span> to avoid losing your selection.
            </p>
          </div>
        </div>

        {/* Checkout Form */}
        <div className="lg:col-span-7">
          <div className="glass p-10 rounded-[2.5rem] border border-white/10">
            <form action="/api/bookings/process" method="POST" className="space-y-8">
              <input type="hidden" name="arena_id" value={arena.id} />
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="slots" value={slotsJson} />

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 text-lg">
                      person
                    </span>
                    <input
                      type="text"
                      name="customer_name"
                      required
                      placeholder="John Doe"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-800"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 text-lg">
                      phone_iphone
                    </span>
                    <input
                      type="tel"
                      name="customer_mobile"
                      required
                      defaultValue={guestIdentifier || ''}
                      placeholder="+91 98765 43210"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-800"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">
                  Email Address <span className="text-gray-800 lowercase italic">(optional)</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 text-lg">
                    mail
                  </span>
                  <input
                    type="email"
                    name="customer_email"
                    placeholder="john@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-800"
                  />
                </div>
              </div>

              <div className="pt-8 space-y-6">
                <button
                  type="submit"
                  className="w-full py-6 rounded-[2rem] font-black text-sm tracking-[0.2em] bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 cursor-pointer"
                >
                  <span>CONFIRM & PAY ₹{total}</span>
                  <span className="material-symbols-outlined font-black">arrow_forward</span>
                </button>

                <div className="flex items-center justify-center gap-6 opacity-30 grayscale">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Visa.svg/1200px-Visa.svg.png"
                    className="h-4"
                    alt="Visa"
                  />
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png"
                    className="h-6"
                    alt="Mastercard"
                  />
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/1200px-UPI-Logo-vector.svg.png"
                    className="h-4"
                    alt="UPI"
                  />
                </div>

                <p className="text-center text-[9px] text-gray-700 uppercase tracking-[0.3em]">
                  End-to-End Encrypted Secure Checkout
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
