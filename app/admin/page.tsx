import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [arenaRows, bookingRows] = await Promise.all([
    query<{ total: number }>('SELECT COUNT(*) AS total FROM arenas'),
    query<{ total: number }>('SELECT COUNT(*) AS total FROM bookings'),
  ]);

  return (
    <main className="grid">
      <section className="hero-card">
        <span className="pill">Admin overview</span>
        <h1 className="display">MySQL-backed control center</h1>
        <p className="meta">This replaces the Filament surface with a Next.js admin entry point.</p>
      </section>

      <section className="stat-grid">
        <div className="stat-card">
          Arenas
          <strong>{arenaRows[0]?.total ?? 0}</strong>
        </div>
        <div className="stat-card">
          Bookings
          <strong>{bookingRows[0]?.total ?? 0}</strong>
        </div>
        <div className="stat-card">
          Status
          <strong>Live</strong>
        </div>
      </section>
    </main>
  );
}