import { getBookingsByRef } from '@/lib/domain';
import { getPayuConfig, generatePayuHash, getEnforcePaymethod } from '@/lib/payment';
import { readRequestOrigin } from '@/lib/session';
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
