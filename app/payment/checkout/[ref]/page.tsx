import { getBookingsByRef } from '@/lib/domain';
import { generatePayuHash, getPayuConfig } from '@/lib/payment';

type Props = {
  params: Promise<{ ref: string }>;
};

export const dynamic = 'force-dynamic';

export default async function PaymentCheckoutPage({ params }: Props) {
  const { ref } = await params;
  const bookings = await getBookingsByRef(ref);

  if (bookings.length === 0) {
    return <main className="arena-card">Booking not found.</main>;
  }

  const firstBooking = bookings[0];
  const totalAmount = bookings.reduce((sum, booking) => sum + Number(booking.amount), 0).toFixed(2);
  const paramsForHash = {
    txnid: ref,
    amount: totalAmount,
    productinfo: `Futsal Arena Booking: ${ref}`,
    firstname: firstBooking.customer_name,
    email: firstBooking.customer_email ?? 'no-email@futsalgoa.com',
  };
  const { merchantKey, payuUrl } = getPayuConfig();
  const hash = generatePayuHash(paramsForHash);

  return (
    <main className="grid" style={{ maxWidth: 760, margin: '0 auto' }}>
      <section className="hero-card">
        <span className="pill">PayU checkout</span>
        <h1 className="display">Confirm payment for {ref}</h1>
        <p className="meta">Amount Rs. {totalAmount}</p>
      </section>

      <section className="form-card">
        <form action={payuUrl} method="post">
          <input type="hidden" name="key" value={merchantKey} />
          <input type="hidden" name="txnid" value={paramsForHash.txnid} />
          <input type="hidden" name="amount" value={paramsForHash.amount} />
          <input type="hidden" name="productinfo" value={paramsForHash.productinfo} />
          <input type="hidden" name="firstname" value={paramsForHash.firstname} />
          <input type="hidden" name="email" value={paramsForHash.email} />
          <input type="hidden" name="hash" value={hash} />
          <input type="hidden" name="surl" value={`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/payment/callback`} />
          <input type="hidden" name="furl" value={`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/payment/callback`} />

          <button className="button" type="submit">
            Continue to PayU
          </button>
        </form>
      </section>
    </main>
  );
}