import { getBookingsByRef } from '@/lib/domain';
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
    email: firstBooking.customer_email || 'test@example.com',
    phone: firstBooking.customer_mobile || '9999999999',
    surl: `${origin}/api/payment/callback`,
    furl: `${origin}/api/payment/callback`,
    // Enforce allowed payment modes per business rules
    enforce_paymethod: getEnforcePaymethod(),
  };

  const hash = generatePayuHash(payuParams);
  const { payuUrl, merchantKey } = getPayuConfig();

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
