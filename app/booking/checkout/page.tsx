import { getArenaById, getArenaPricingForDate, queryOne, query, getRefundPolicyConfig, formatRefundPolicyText, isPlaceholderEmail } from '@/lib/domain';
import { readGuestIdentifier, readAuthUserId } from '@/lib/session';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';
import { getPayuConfig } from '@/lib/payment';
import { getArenaEntryMode, getArenaPaymentMode, getCustomerRefundEnabled } from '@/lib/admin';
import { getOrCreateCsrfToken } from '@/lib/csrf';
import { evaluateCancellationEligibility, getInvoiceMonthEnd, DEFAULT_CANCEL_CUTOFF_HOURS, RESCHEDULE_CUTOFF_HOURS, RESCHEDULE_MAX_WINDOW_DAYS } from '@/lib/refund-policy';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CheckoutForm from '@/components/CheckoutForm';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const bookingError = typeof resolvedSearchParams.error === 'string' ? resolvedSearchParams.error : null;
  const arenaId = Number(resolvedSearchParams.arena_id);
  const date = typeof resolvedSearchParams.date === 'string' ? resolvedSearchParams.date : '';
  const slotsJson = typeof resolvedSearchParams.slots === 'string' ? resolvedSearchParams.slots : '[]';

  // Optional pre-filled customer details from query params. The email in
  // particular can arrive here carrying the placeholder value if an
  // upstream page (e.g. the arena page) forwarded an unfiltered
  // currentUser.email into its URL — filter it here too, not just at the
  // DB read below, so a placeholder can never survive either path.
  let paramName = typeof resolvedSearchParams.name === 'string' ? resolvedSearchParams.name : '';
  let paramMobile = typeof resolvedSearchParams.mobile === 'string' ? resolvedSearchParams.mobile : '';
  const rawParamEmail = typeof resolvedSearchParams.email === 'string' ? resolvedSearchParams.email : '';
  let paramEmail = isPlaceholderEmail(rawParamEmail) ? '' : rawParamEmail;

  const userId = await readAuthUserId();
  if (!userId) {
    // Checkout requires a verified session (mobile or email OTP) rather
    // than the guest-checkout flow this used to allow, which silently
    // created a real `users` row from whatever mobile/email was typed into
    // the form with zero verification. Preserve the exact checkout URL
    // (arena/date/slots/pre-fill params) via `next` so the customer lands
    // right back here, slot selection intact, once they've logged in.
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (typeof value === 'string') qs.set(key, value);
    }
    redirect(`/login?next=${encodeURIComponent(`/booking/checkout?${qs.toString()}`)}`);
  }

  const currentUser = await queryOne<{ name?: string; email?: string; customer_mobile?: string }>('SELECT name, email, customer_mobile FROM users WHERE id = ?', [userId]);
  if (currentUser) {
    paramName = currentUser.name || paramName;
    paramMobile = currentUser.customer_mobile || paramMobile;
    paramEmail = (currentUser.email && !isPlaceholderEmail(currentUser.email)) ? currentUser.email : paramEmail;
  }

  let slots: string[] = [];
  try {
    slots = JSON.parse(slotsJson);
  } catch (e) {
    console.error('Failed to parse slots JSON', e);
  }

  if (!arenaId || !date || (slots || []).length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl sm:text-4xl font-black uppercase">Invalid checkout session.</h1>
        <Link href="/" className="text-primary mt-4 inline-block font-bold">Back to Home</Link>
      </div>
    );
  }

  const arena = await getArenaById(arenaId);
  if (!arena) return <div className="p-10 text-center">Arena not found.</div>;

  const pricing = await getArenaPricingForDate(arenaId, date);
  const safePricing = pricing || [];
  const selectedPricing = safePricing.filter((p) => slots.includes(p?.time_slot));
  const total = selectedPricing.reduce((sum, p) => sum + Number(p?.price || 0), 0);
  const entryMode = await getArenaEntryMode(arenaId);
  if (entryMode === 'blocked') {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl sm:text-4xl font-black uppercase">Bookings are temporarily blocked for this arena.</h1>
        <Link href="/" className="text-primary mt-4 inline-block font-bold">Back to Home</Link>
      </div>
    );
  }

  const checkoutTotal = entryMode === 'free' ? 0 : total;
  const paymentMode = await getArenaPaymentMode(arenaId);
  const refundsEnabled = await getCustomerRefundEnabled(arenaId);
  const { merchantKey, merchantSalt } = getPayuConfig();
  const payuReady = Boolean(merchantKey && merchantSalt);

  const guestIdentifier = await readGuestIdentifier();
  const csrfToken = await getOrCreateCsrfToken();

  const effectiveMobile = paramMobile || guestIdentifier || '';
  const refundPolicy = await getRefundPolicyConfig();

  const cutoffSetting = await query<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'cancellation_cutoff_hours'`
  );
  let cutoffHours = DEFAULT_CANCEL_CUTOFF_HOURS;
  if (cutoffSetting?.[0]?.value) {
    const parsed = parseInt(cutoffSetting[0].value, 10);
    if (!isNaN(parsed) && parsed >= 24 && parsed <= 72) cutoffHours = parsed;
  }
  // Preview only — no booking exists yet, so "paid for" is assumed to be right now.
  const previewPaymentDate = new Date();
  const cancellationEligibility = evaluateCancellationEligibility(date, slots, Date.now(), cutoffHours, previewPaymentDate);
  const isWithinNoRefundWindow = !cancellationEligibility.refundEligible;
  const invoiceMonthEnd = getInvoiceMonthEnd(previewPaymentDate);
  const invoiceMonthEndText = invoiceMonthEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-8 sm:mb-16">
        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner flex-shrink-0">
          <span className="material-symbols-outlined text-2xl sm:text-3xl">shield_lock</span>
        </div>
        <div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter italic">
            SECURE <span className="text-primary text-stroke">CHECKOUT</span>
          </h1>
          <p className="label-classic">
            Complete your booking for {arena.name}
          </p>
        </div>
      </div>

      {bookingError && (
        <div className="mb-8 p-4 sm:p-6 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold flex items-start gap-3">
          <span className="material-symbols-outlined text-xl shrink-0">error</span>
          <span>{bookingError} Please go back and pick a different slot.</span>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 lg:gap-16">
        {/* Checkout Form — Order 1 on mobile, Order 2 on desktop */}
        <div className="order-1 lg:order-2 lg:col-span-7 space-y-6 sm:space-y-8">
          {/* Disclaimers render before the form/pay button now — the
              customer should read the lock-expiry and refund terms before
              they commit, not scroll past a "CONFIRM & PAY" button to find
              them underneath it. */}
          <div className="flex flex-col gap-4">
            {/* No backdrop-blur here (unlike .glass) — a translucent blurred
                panel stacked under the sticky header mis-composites on
                mobile Safari during scroll, flashing as a solid color block. */}
            <div className="flex items-start gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-primary/20 bg-primary/10">
              <span className="material-symbols-outlined text-primary text-xl sm:text-2xl animate-pulse flex-shrink-0">timer</span>
              <p className="text-[10px] font-black text-primary/80 uppercase tracking-[0.15em] sm:tracking-[0.2em] leading-relaxed">
                These slots are temporarily locked. Complete the booking within{' '}
                <span className="text-white underline decoration-primary/50 underline-offset-4">10 minutes</span> to secure your pitch.
              </p>
            </div>

            {!refundsEnabled ? (
              <div className="flex items-start gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-red-500/30 bg-red-500/10">
                <span className="material-symbols-outlined text-red-500 text-xl sm:text-2xl flex-shrink-0">event_busy</span>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] leading-relaxed">
                    NO REFUNDS — RESCHEDULE ONLY
                  </p>
                  <p className="text-xs font-medium text-white/70 leading-relaxed">
                    Cancellations are not refunded under any circumstances. You may instead reschedule this booking once, to a slot priced the same or less, up to {RESCHEDULE_CUTOFF_HOURS} hours before your session and within {RESCHEDULE_MAX_WINDOW_DAYS} days.
                  </p>
                  <p className="text-xs font-medium text-white/60 leading-relaxed">
                    Cancellation itself remains open right up to your session — it simply won&apos;t carry a refund.
                  </p>
                </div>
              </div>
            ) : paymentMode === 'online' ? (
              <>
                <div className="flex items-start gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-red-500/20 bg-red-500/10">
                  <span className="material-symbols-outlined text-red-500 text-xl sm:text-2xl flex-shrink-0">event_busy</span>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] leading-relaxed">
                      CANCELLATION & REFUND POLICY
                    </p>
                    <p className="text-xs font-medium text-white/60 leading-relaxed">
                      Cancel up to {cutoffHours} hours before your scheduled session, and by <strong className="text-white">{invoiceMonthEndText}</strong> at the latest, to be eligible for a refund. Cancellation itself stays open right up to your session either way.
                    </p>
                    <p className="text-xs font-medium text-white/60 leading-relaxed">
                      Refund: {formatRefundPolicyText(refundPolicy, slots.length)} deducted from the refundable amount.
                    </p>
                  </div>
                </div>

                {isWithinNoRefundWindow && checkoutTotal > 0 && (
                  <div className="flex items-start gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-red-500/40 bg-red-500/10">
                    <span className="material-symbols-outlined text-red-500 text-xl sm:text-2xl flex-shrink-0 animate-pulse">warning</span>
                    <p className="text-xs font-black text-red-400 uppercase tracking-widest leading-relaxed">
                      {cancellationEligibility.code === 'NO_REFUND_MONTH_EXPIRED'
                        ? `This booking's refund window has already closed. If you cancel, you will NOT be eligible for any refund.`
                        : `This booking starts within ${cutoffHours} hours. If you cancel or don't show up, you will NOT be eligible for any refund.`}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-yellow-500/20 bg-yellow-500/5">
                <span className="material-symbols-outlined text-yellow-400 text-xl sm:text-2xl flex-shrink-0">event_busy</span>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] leading-relaxed">
                    CANCELLATION POLICY
                  </p>
                  <p className="text-xs font-medium text-white/60 leading-relaxed">
                    This is a pay-at-venue booking — payment is not collected online. You can cancel from your dashboard, but since no online payment is taken, no refund applies.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card !p-6 sm:!p-10 lg:!p-12">
            <h2 className="text-xl sm:text-2xl font-black uppercase italic mb-8 tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">edit_document</span>
              Customer Details
            </h2>

            <CheckoutForm
              formAction={`${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/process`}
              arenaId={arena.id}
              date={date}
              slotsJson={slotsJson}
              csrfToken={csrfToken}
              paramName={paramName}
              effectiveMobile={effectiveMobile}
              paramEmail={paramEmail}
              checkoutTotal={checkoutTotal}
              payuReady={payuReady}
              cutoffHours={cutoffHours}
              refundFeeText={formatRefundPolicyText(refundPolicy, slots.length)}
              isWithinNoRefundWindow={isWithinNoRefundWindow}
              paymentMode={paymentMode}
              refundsEnabled={refundsEnabled}
              refundValidUntilText={invoiceMonthEndText}
            />
          </div>
        </div>

        {/* Booking Details Summary — Order 2 on mobile, Order 1 on desktop */}
        <div className="order-2 lg:order-1 lg:col-span-5 space-y-6 sm:space-y-8">
          <div className="glass-card relative overflow-hidden !p-6 sm:!p-10">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] hidden sm:block">
              <span className="material-symbols-outlined text-[120px]">receipt_long</span>
            </div>

            <h2 className="label-classic mb-6 sm:mb-10">Reservation Summary</h2>

            <div className="space-y-6 sm:space-y-8">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl glass flex items-center justify-center text-white/40 border-white/5 flex-shrink-0">
                  <span className="material-symbols-outlined text-xl sm:text-2xl">stadium</span>
                </div>
                <div>
                  <span className="label-classic !ml-0 mb-1">Arena</span>
                  <span className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tight">{arena.name}</span>
                </div>
              </div>

              <div className="flex items-start gap-4 sm:gap-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl glass flex items-center justify-center text-white/40 border-white/5 flex-shrink-0">
                  <span className="material-symbols-outlined text-xl sm:text-2xl">calendar_today</span>
                </div>
                <div>
                  <span className="label-classic !ml-0 mb-1">Date</span>
                  <span className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tight">
                    {new Date(date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>
              </div>

              <div className="pt-6 sm:pt-8 border-t border-white/5">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <span className="label-classic !ml-0">Duration</span>
                  <span className="pill-status">
                    {getDurationText(slots)}
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 break-words overflow-hidden">
                    <span className="label-classic !ml-0 mb-2">Time Slots</span>
                    <span className="text-xl sm:text-2xl font-black text-white italic tracking-tighter uppercase break-words block max-w-full">
                      {mergeSlots(slots).join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 sm:pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 overflow-hidden">
                <span className="label-classic !ml-0">Total Amount</span>
                <span className="text-3xl sm:text-5xl font-black text-white italic tracking-tighter break-words max-w-full">₹{checkoutTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
