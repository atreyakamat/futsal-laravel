import { getArenaById, getArenaPricing, findUserByIdentifier } from '@/lib/domain';
import { readAuthUserId, readGuestIdentifier } from '@/lib/session';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';
import { getPayuConfig } from '@/lib/payment';
import { getArenaEntryMode } from '@/lib/admin';
import Link from 'next/link';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const arenaId = Number(resolvedSearchParams.arena_id);
  const date = typeof resolvedSearchParams.date === 'string' ? resolvedSearchParams.date : '';
  const slotsJson = typeof resolvedSearchParams.slots === 'string' ? resolvedSearchParams.slots : '[]';
  let slots: string[] = [];
  try {
    slots = JSON.parse(slotsJson);
  } catch (e) {
    console.error('Failed to parse slots JSON', e);
  }

  if (!arenaId || !date || (slots || []).length === 0) {
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
  const safePricing = pricing || [];
  const selectedPricing = safePricing.filter((p) => slots.includes(p?.time_slot));
  const total = selectedPricing.reduce((sum, p) => sum + Number(p?.price || 0), 0);
  const entryMode = await getArenaEntryMode(arenaId);
  if (entryMode === 'blocked') {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-black uppercase">Bookings are temporarily blocked for this arena.</h1>
        <Link href="/" className="text-primary mt-4 inline-block font-bold">Back to Home</Link>
      </div>
    );
  }

  const checkoutTotal = entryMode === 'free' ? 0 : total;
  const { merchantKey, merchantSalt } = getPayuConfig();
  const payuReady = Boolean(merchantKey && merchantSalt);

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
      <div className="flex items-center gap-6 mb-16">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
          <span className="material-symbols-outlined text-3xl">shield_lock</span>
        </div>
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">
            SECURE <span className="text-primary text-stroke">CHECKOUT</span>
          </h1>
          <p className="label-classic">
            Complete your booking for {arena.name}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-16">
        {/* Booking Details */}
        <div className="lg:col-span-5 space-y-8">
          <div className="glass-card relative overflow-hidden !p-10">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
              <span className="material-symbols-outlined text-[120px]">receipt_long</span>
            </div>

            <h2 className="label-classic mb-10">Reservation Summary</h2>

            <div className="space-y-8">
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-white/20 border-white/5">
                  <span className="material-symbols-outlined text-2xl">stadium</span>
                </div>
                <div>
                  <span className="label-classic !ml-0 mb-1">Arena</span>
                  <span className="text-xl font-black text-white uppercase italic tracking-tight">{arena.name}</span>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-white/20 border-white/5">
                  <span className="material-symbols-outlined text-2xl">calendar_today</span>
                </div>
                <div>
                  <span className="label-classic !ml-0 mb-1">Date</span>
                  <span className="text-xl font-black text-white uppercase italic tracking-tight">
                    {new Date(date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <span className="label-classic !ml-0">Duration</span>
                  <span className="pill-status">
                    {getDurationText(slots)}
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                    <span className="label-classic !ml-0 mb-2">Time Slots</span>
                    <span className="text-2xl font-black text-white italic tracking-tighter uppercase">
                      {mergeSlots(slots).join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex justify-between items-end">
                <span className="label-classic !ml-0">Total Amount</span>
                <span className="text-5xl font-black text-white italic tracking-tighter">₹{checkoutTotal}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 glass rounded-[2rem] border-primary/20 bg-primary/5">
            <span className="material-symbols-outlined text-primary text-2xl animate-pulse">timer</span>
            <p className="text-[10px] font-black text-primary/80 uppercase tracking-[0.2em] leading-relaxed">
              These slots are temporarily locked. Complete the booking within{' '}
              <span className="text-white underline decoration-primary/50 underline-offset-4">10 minutes</span> to secure your pitch.
            </p>
          </div>
        </div>

        {/* Checkout Form */}
        <div className="lg:col-span-7">
          <div className="glass-card !p-12">
            <form action="/api/bookings/process" method="POST" className="space-y-10">
              <input type="hidden" name="arena_id" value={arena.id} />
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="slots" value={slotsJson} />

              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="label-classic">Full Name</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-xl">
                      person
                    </span>
                    <input
                      type="text"
                      name="customer_name"
                      required
                      placeholder="John Doe"
                      className="input-field pl-12"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="label-classic">Mobile Number</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-xl">
                      phone_iphone
                    </span>
                    <input
                      type="tel"
                      name="customer_mobile"
                      required
                      defaultValue={guestIdentifier || ''}
                      placeholder="+91 98765 43210"
                      className="input-field pl-12"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="label-classic">
                  Email Address <span className="text-white/10 italic lowercase">(optional)</span>
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-xl">
                    mail
                  </span>
                  <input
                    type="email"
                    name="customer_email"
                    placeholder="john@example.com"
                    className="input-field pl-12"
                  />
                </div>
              </div>

              <div className="pt-10 space-y-8">
                <button
                  type="submit"
                  className="btn-primary w-full py-6 text-sm flex items-center justify-center gap-4 scale-105"
                >
                  <span className="font-black italic">{checkoutTotal === 0 ? 'CONFIRM BOOKING' : `CONFIRM & PAY ₹${checkoutTotal}`}</span>
                  <span className="material-symbols-outlined font-black">arrow_forward</span>
                </button>

                {!payuReady && checkoutTotal > 0 && (
                  <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-300 text-[10px] font-black uppercase tracking-widest">
                    PayU is not configured. Set PAYU_MERCHANT_KEY and PAYU_SALT to enable payments.
                  </div>
                )}

                <div className="flex items-center justify-center gap-8 opacity-20 grayscale hover:opacity-40 transition-opacity">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Visa.svg/1200px-Visa.svg.png"
                    className="h-5"
                    alt="Visa"
                  />
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png"
                    className="h-8"
                    alt="Mastercard"
                  />
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/1200px-UPI-Logo-vector.svg.png"
                    className="h-5"
                    alt="UPI"
                  />
                </div>

                <p className="text-center text-[9px] text-white/10 uppercase tracking-[0.4em] font-black">
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
