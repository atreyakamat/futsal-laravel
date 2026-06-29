import { getBookingsByRef } from '@/lib/domain';
import { getPayuConfig, generatePayuHash } from '@/lib/payment';
import { readRequestOrigin } from '@/lib/session';
import { redirect } from 'next/navigation';

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
  };

  const hash = generatePayuHash(payuParams);
  let { payuUrl, merchantKey } = getPayuConfig();

  // If we are on localhost AND strictly in development mode, route to our Mock PayU gateway
  if (process.env.NODE_ENV === 'development' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    payuUrl = `${origin}/api/mock-payu`;
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

      <form action={payuUrl} method="post" id="payu-form" className="hidden">
        <input type="hidden" name="key" value={merchantKey} />
        <input type="hidden" name="hash" value={hash} />
        <input type="hidden" name="txnid" value={payuParams.txnid} />
        <input type="hidden" name="amount" value={payuParams.amount} />
        <input type="hidden" name="firstname" value={payuParams.firstname} />
        <input type="hidden" name="email" value={payuParams.email} />
        <input type="hidden" name="phone" value={payuParams.phone} />
        <input type="hidden" name="productinfo" value={payuParams.productinfo} />
        <input type="hidden" name="surl" value={payuParams.surl} />
        <input type="hidden" name="furl" value={payuParams.furl} />
      </form>

      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById('payu-form').submit();`,
        }}
      />
    </div>
  );
}
