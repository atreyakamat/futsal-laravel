import { getSecurityBookings } from '@/lib/domain';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export default async function SecurityVerifyPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const ticketNumber = typeof resolvedSearchParams.ticket_number === 'string' ? resolvedSearchParams.ticket_number : '';

  if (!ticketNumber) {
    return <main className="arena-card">Provide a ticket number from the scan screen.</main>;
  }

  const bookings = await getSecurityBookings(ticketNumber);

  if (bookings.length === 0) {
    return <main className="arena-card">Invalid ticket number.</main>;
  }

  const booking = bookings[0];

  return (
    <main className="grid" style={{ maxWidth: 760, margin: '0 auto' }}>
      <section className="hero-card">
        <span className="pill">Ticket verified</span>
        <h1 className="display">{booking.customer_name}</h1>
        <p className="meta">Ticket {booking.ticket_number}</p>
        <p className="meta">{booking.booking_date} · {booking.time_slot}</p>
      </section>

      <section className="form-card">
        <form className="form" action="/api/security/confirm-entry" method="post">
          <input type="hidden" name="ticket_number" value={ticketNumber} />
          <button className="button" type="submit">
            Confirm entry
          </button>
        </form>
      </section>
    </main>
  );
}