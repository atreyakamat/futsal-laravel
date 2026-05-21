import { query } from '@/lib/db';
import type { ArenaSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getArenas(): Promise<ArenaSummary[]> {
  const rows = await query<{
    id: number;
    name: string;
    slug: string;
    address: string | null;
    description: string | null;
    cover_image: string | null;
    status: string;
    min_price: string | number | null;
  }>(
    `SELECT a.id, a.name, a.slug, a.address, a.description, a.cover_image, a.status,
            COALESCE(MIN(p.price), 500) AS min_price
       FROM arenas a
       LEFT JOIN pricings p ON p.arena_id = a.id
      WHERE a.status = 'active'
   GROUP BY a.id, a.name, a.slug, a.address, a.description, a.cover_image, a.status
   ORDER BY a.name ASC`
  );

  return rows.map((arena) => ({
    ...arena,
    min_price: Number(arena.min_price ?? 500),
  }));
}

export default async function HomePage() {
  const arenas = await getArenas();

  return (
    <main>
      <section className="hero">
        <div className="hero-card">
          <span className="pill">MySQL-backed booking platform</span>
          <h1 className="display">Book a futsal slot without the Laravel stack.</h1>
          <p>
            This migration keeps the booking, OTP, slot locking, payment callback, ticket,
            security, and AI flows while moving the application runtime to Next.js and Node.
          </p>
          <div className="actions">
            <a className="button" href="#arenas">
              Browse arenas
            </a>
            <a className="button-secondary" href="/login">
              Continue with OTP
            </a>
          </div>
        </div>

        <aside className="panel">
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Migration surface</h2>
          </div>
          <div className="grid" style={{ gap: 12 }}>
            <div className="notice">Arena discovery and pricing</div>
            <div className="notice">Slot locks and booking creation</div>
            <div className="notice">PayU callback and ticketing</div>
            <div className="notice">Security verification and admin views</div>
          </div>
        </aside>
      </section>

      <div className="section-title" id="arenas">
        <h2>Available arenas</h2>
        <span className="meta">{arenas.length} active venues</span>
      </div>

      <div className="grid arena-grid">
        {arenas.map((arena) => (
          <article className="arena-card" key={arena.id}>
            <span className="pill">From Rs. {arena.min_price.toFixed(0)}</span>
            <h3 className="display" style={{ marginBottom: 8 }}>
              {arena.name}
            </h3>
            <p className="meta" style={{ minHeight: 72 }}>
              {arena.description ?? 'Arena details are managed from MySQL and rendered here in Next.js.'}
            </p>
            <div className="actions">
              <a className="button-secondary" href={`/arena/${arena.slug}`}>
                View arena
              </a>
            </div>
          </article>
        ))}
        {arenas.length === 0 ? (
          <div className="arena-card">No active arenas were found in MySQL.</div>
        ) : null}
      </div>
    </main>
  );
}