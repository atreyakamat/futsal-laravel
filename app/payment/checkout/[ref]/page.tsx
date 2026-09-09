import { getBookingsByRef, query } from '@/lib/domain';
import { getPayuConfig, generatePayuHash, getEnforcePaymethod } from '@/lib/payment';
import { readRequestOrigin, readAuthUserId } from '@/lib/session';
import { getAdminContext } from '@/lib/admin';
import { redirect } from 'next/navigation';
import PaymentRedirector from '@/components/PaymentRedirector';

type Props = {
  params: Promise<{ ref: string }>;
};

export const dynamic = 'force-dynamic';

export default async function PaymentCheckoutPage({ params }: Props) {
  const { ref: bookingRef } = await params;
  const bookings = await getBookingsByRef(bookingRef);

  if (!bookings || bookings?.length === 0) {
    redirect('/');
  }

  const firstBooking = bookings[0];

  // This page used to only ever be reached in the tight window right after
  // booking creation, when 'pending' was a safe assumption. It's now also a
  // persistent "Complete Payment" link on the customer dashboard (see
  // app/dashboard/page.tsx), revisitable any time — including after the
  // booking already resolved elsewhere (paid on another device, expired,
  // cancelled). Re-sending an already-resolved booking through PayU risks a
  // double charge, so redirect to wherever it actually stands instead.
  if (firstBooking.payment_status === 'confirmed') {
    redirect(`/booking/success/${bookingRef}`);
  }
  if (firstBooking.payment_status !== 'pending') {
    redirect(`/booking/payment-failed/${bookingRef}`);
  }

  // Require the customer to actually be logged in as the booking's owner —
  // this page carries no other proof of identity, and now that it's linked
  // directly from booking-reminder emails (see lib/payment-reminder.ts) it
  // needs to actually enforce the login step those emails point to, not
  // just assume whoever clicked it is who they say they are.
  const authUserId = await readAuthUserId();
  if (!authUserId) {
    redirect(`/login?next=${encodeURIComponent(`/payment/checkout/${bookingRef}`)}`);
  }
  if (authUserId !== firstBooking.user_id) {
    const context = await getAdminContext(authUserId);
    const isStaff = !!context && ['super_admin', 'admin', 'arena_admin', 'manager'].includes(context.role);
    if (!isStaff) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-dark text-white px-6 text-center">
          <h1 className="text-2xl font-black uppercase tracking-tighter italic mb-4">Not Your Booking</h1>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest max-w-xs mx-auto">
            This booking doesn&apos;t belong to your account. Log in as the customer it was made for to complete payment.
          </p>
        </div>
      );
    }
  }

  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0);
  const origin = await readRequestOrigin();

  const payuParams = {
    txnid: bookingRef,
    amount: totalAmount.toFixed(2),
    productinfo: `AgnelBooking_${bookingRef}`,
    firstname: firstBooking.customer_name,
    // `example.com` is an IANA-reserved documentation-only domain — sending
    // it to a live payment gateway is a classic bot/test-traffic signal that
    // fraud/WAF filters commonly block outright. Fall back to a real,
    // merchant-owned domain instead when the customer didn't supply an email.
    email: firstBooking.customer_email || `guest-${bookingRef}@agnelarenagoa.com`,
    phone: firstBooking.customer_mobile || '9999999999',
    surl: `${origin}/api/payment/callback`,
    furl: `${origin}/api/payment/callback`,
    // Enforce allowed payment modes per business rules
    enforce_paymethod: getEnforcePaymethod(),
  };

  const hash = generatePayuHash(payuParams);
  const { payuUrl, merchantKey } = getPayuConfig();

  // Log the outgoing request BEFORE redirecting, not just PayU's callback
  // afterward — payment_audit_logs previously only got a row once PayU
  // called back, which meant a request PayU rejected before processing
  // (e.g. the "Too many Requests" gateway-level block) left zero trace on
  // our side, indistinguishable after the fact from "never attempted".
  // This row is the durable proof of exactly what we sent — merchant key,
  // txnid, amount, email/phone, gateway URL, timestamp — so a future
  // support escalation isn't dependent on memory or screenshots, and any
  // malformed/placeholder value on our end (like the old `test@example.com`
  // fallback) is caught immediately by reading this table instead of
  // guessed at afterward. Never includes PAYU_MERCHANT_SALT — that's not
  // part of `payuParams` and must never be logged anywhere.
  try {
    await query(
      `INSERT INTO payment_audit_logs (booking_ref, status, amount, mihpayid, payload, created_at)
       VALUES (?, 'initiated', ?, NULL, ?, NOW())`,
      [
        bookingRef,
        totalAmount,
        JSON.stringify({
          gateway_url: payuUrl,
          merchant_key: merchantKey,
          txnid: payuParams.txnid,
          amount: payuParams.amount,
          email: payuParams.email,
          phone: payuParams.phone,
          firstname: payuParams.firstname,
          productinfo: payuParams.productinfo,
          enforce_paymethod: payuParams.enforce_paymethod,
        }),
      ]
    );
  } catch (e) {
    // Logging must never block a real checkout attempt.
    console.error('Failed to write payment initiation audit log:', e);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-dark text-white px-6 text-center">
      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-8" />
      <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-4">
        REDIRECTING TO <span className="text-primary">PAYMENT</span>
      </h1>
      <p className="text-gray-500 text-sm font-bold uppercase tracking-widest max-w-xs mx-auto">
        Please wait while we connect you to our secure payment gateway. Do not refresh or close this window.
      </p>

      <PaymentRedirector
        payuUrl={payuUrl}
        params={{
          ...payuParams,
          key: merchantKey,
          hash,
        }}
      />
    </div>
  );
}
