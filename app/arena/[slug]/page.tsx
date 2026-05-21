import { getArenaBySlug, getArenaPricing, getBookedSlots, getLockedSlots, getMyLockedSlots } from '@/lib/domain';
import { getOrCreateSessionId } from '@/lib/session';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';

export default async function ArenaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const arena = await getArenaBySlug(slug);

  if (!arena) {
    return <main className="arena-card">Arena not found.</main>;
  }

  const pricing = await getArenaPricing(arena.id);
  const selectedDate = typeof resolvedSearchParams.date === 'string' ? resolvedSearchParams.date : '';
  const sessionId = await getOrCreateSessionId();

  const statusRows = selectedDate
    ? await Promise.all([
        getBookedSlots(arena.id, selectedDate),
        getLockedSlots(arena.id, selectedDate, sessionId),
        getMyLockedSlots(arena.id, selectedDate, sessionId),
      ])
    : null;

  const bookedSlots = statusRows?.[0] ?? [];
  const lockedSlots = statusRows?.[1] ?? [];
  const mySlots = statusRows?.[2] ?? [];

  return (
    <main className="grid" style={{ gap: 22 }}>
      <section className="hero-card">
        <span className="pill">Arena detail</span>
        <h1 className="display">{arena.name}</h1>
        <p className="meta">{arena.description ?? 'Arena details loaded from MySQL.'}</p>
        <p className="meta">{arena.address ?? 'No address provided'}</p>
      </section>

      <section className="form-card">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Pick a date</h2>
        </div>
        <form className="form" method="get">
          <div className="field">
            <label htmlFor="date">Booking date</label>
            <input id="date" name="date" type="date" defaultValue={selectedDate} required />
          </div>
          <button className="button" type="submit">
            Load slots
          </button>
        </form>
      </section>

      {selectedDate ? (
        <section className="form-card">
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Available slots for {selectedDate}</h2>
          </div>

          <form className="form" action="/api/bookings/process" method="post">
            <input type="hidden" name="arena_id" value={arena.id} />
            <input type="hidden" name="date" value={selectedDate} />

            <div className="slots">
              {pricing.map((slot) => {
                const status = bookedSlots.includes(slot.time_slot)
                  ? 'booked'
                  : lockedSlots.includes(slot.time_slot)
                    ? 'locked'
                    : mySlots.includes(slot.time_slot)
                      ? 'selected'
                      : 'available';

                return (
                  <label className="slot" data-status={status} key={slot.id}>
                    <span>
                      <strong>{slot.time_slot}</strong>
                      <div className="meta">Rs. {Number(slot.price).toFixed(0)}</div>
                    </span>
                    <input type="checkbox" name="slots" value={slot.time_slot} disabled={status === 'booked' || status === 'locked'} />
                  </label>
                );
              })}
            </div>

            <div className="divider" />

            <div className="field">
              <label htmlFor="customer_name">Customer name</label>
              <input id="customer_name" name="customer_name" type="text" required maxLength={100} />
            </div>
            <div className="field">
              <label htmlFor="customer_mobile">Mobile</label>
              <input id="customer_mobile" name="customer_mobile" type="text" required maxLength={15} />
            </div>
            <div className="field">
              <label htmlFor="customer_email">Email</label>
              <input id="customer_email" name="customer_email" type="email" />
            </div>

            <button className="button" type="submit">
              Continue to checkout
            </button>
          </form>
        </section>
      ) : null}
    </main>
  );
}