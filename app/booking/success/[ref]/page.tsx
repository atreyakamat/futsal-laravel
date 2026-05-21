import { getBookingsByRef } from '@/lib/domain';
import { mergeSlots, getDurationText } from '@/lib/slot-merge';

type Props = {
  params: Promise<{ ref: string }>;
};

export const dynamic = 'force-dynamic';

export default async function BookingSuccessPage({ params }: Props) {
  const { ref } = await params;
  const bookings = await getBookingsByRef(ref);

  if (bookings.length === 0) {
    return <main className="arena-card">Booking not found.</main>;
  }

  const slots = bookings.map((booking) => booking.time_slot);
  const mergedSlots = mergeSlots(slots);

  return (
    <main className="grid" style={{ maxWidth: 760, margin: '0 auto' }}>
      <section className="hero-card">
        <span className="pill">Booking confirmed</span>
        <h1 className="display">Your reservation is ready</h1>
        <p className="meta">Reference {ref}</p>
        <p className="meta">Slots: {mergedSlots.join(', ')}</p>
        <p className="meta">Duration: {getDurationText(slots)}</p>
      </section>

      <section className="form-card">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Booking summary</h2>
        </div>
        <div className="grid">
          {bookings.map((booking) => (
            <div className="stat-card" key={booking.id}>
              <span className="pill">{booking.payment_status}</span>
              <strong>{booking.time_slot}</strong>
              <div className="meta">Ticket {booking.ticket_number}</div>
              <div className="meta">Rs. {Number(booking.amount).toFixed(0)}</div>
            </div>
          ))}
        </div>
        <div className="divider" />
        <a className="button" href={`/booking/ticket/${ref}`} target="_blank" rel="noreferrer">
          Open ticket
        </a>
        <a className="button-secondary" href="/dashboard">
          Go to dashboard
        </a>
      </section>
    </main>
  );
}