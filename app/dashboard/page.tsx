import { getBookingsForUser } from '@/lib/domain';
import { readAuthUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const userId = await readAuthUserId();

  if (!userId) {
    return (
      <main className="grid" style={{ maxWidth: 760, margin: '0 auto' }}>
        <section className="hero-card">
          <span className="pill">User dashboard</span>
          <h1 className="display">Sign in to see your bookings</h1>
          <p className="meta">Login uses OTP and persists the user ID in an httpOnly cookie.</p>
          <a className="button" href="/login">
            Go to login
          </a>
        </section>
      </main>
    );
  }

  const bookings = await getBookingsForUser(userId);

  return (
    <main>
      <div className="section-title">
        <h2>My bookings</h2>
        <form action="/api/auth/logout" method="post">
          <button className="button-secondary" type="submit">
            Logout
          </button>
        </form>
      </div>

      <div className="grid">
        {bookings.length === 0 ? (
          <div className="arena-card">No bookings found yet.</div>
        ) : null}
        {bookings.map((booking) => (
          <article className="arena-card" key={`${booking.booking_ref}-${booking.time_slot}-${booking.id}`}>
            <span className="pill">{booking.payment_status}</span>
            <h3 className="display" style={{ marginBottom: 8 }}>
              {booking.booking_ref}
            </h3>
            <p className="meta">
              {booking.booking_date} · {booking.time_slot} · Rs. {Number(booking.amount).toFixed(0)}
            </p>
            <p className="meta">Ticket {booking.ticket_number ?? 'pending'}</p>
          </article>
        ))}
      </div>
    </main>
  );
}