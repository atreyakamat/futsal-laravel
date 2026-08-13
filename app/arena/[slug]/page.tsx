import { getArenaBySlug, getArenaPricing, queryOne, query } from '@/lib/domain';
import BookingSystem from '@/components/BookingSystem';
import { getOrCreateCsrfToken } from '@/lib/csrf';
import { readAuthUserId } from '@/lib/session';
import Link from 'next/link';

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
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-black uppercase">Arena not found.</h1>
        <Link href="/" className="text-primary mt-4 inline-block font-bold">Back to Home</Link>
      </div>
    );
  }

  const pricing = await getArenaPricing(arena.id);
  const safePricing = pricing || [];
  const minPrice = safePricing?.length > 0 ? Math.min(...safePricing.map(p => Number(p.price))) : 500;
  const selectedDate = typeof resolvedSearchParams.date === 'string' ? resolvedSearchParams.date : new Date().toISOString().split('T')[0];
  const csrfToken = await getOrCreateCsrfToken();
  
  const userId = await readAuthUserId();
  let currentUser = null;
  if (userId) {
    currentUser = await queryOne<{ name?: string; email?: string; customer_mobile?: string }>('SELECT name, email, customer_mobile FROM users WHERE id = ?', [userId]);
  }

  const [galleryImages, amenities] = await Promise.all([
    query<{ id: number; url: string }>('SELECT id, url FROM arena_images WHERE arena_id = ? ORDER BY sort_order ASC, id ASC', [arena.id]),
    query<{ id: number; name: string; icon: string }>(
      `SELECT am.id, am.name, am.icon FROM amenities am
        JOIN arena_amenities aa ON aa.amenity_id = am.id
       WHERE aa.arena_id = ?
       ORDER BY am.name ASC`,
      [arena.id]
    ),
  ]);

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <section className="relative h-[45vh] sm:h-[50vh] min-h-[320px] sm:min-h-[400px] flex items-end pb-8 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={arena.cover_image || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=1920'}
            className="w-full h-full object-cover scale-105"
            alt={arena.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/60 to-transparent" />
          <div className="absolute inset-0 hero-gradient opacity-80" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-10">
            <div>
              <Link
                href="/"
                className="btn-secondary !py-2 !px-4 !rounded-full mb-4 sm:mb-8 inline-flex items-center gap-2 group"
              >
                <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">
                  arrow_back
                </span>
                BACK TO EXPLORE
              </Link>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase mb-3 sm:mb-6 italic">{arena.name}</h1>
              <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                <span className="flex items-center gap-2 text-white/60 font-black uppercase tracking-widest text-[10px] sm:text-xs">
                  <span className="material-symbols-outlined text-primary text-lg sm:text-xl">location_on</span>
                  {arena.address}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shadow-[0_0_10px_rgba(13,242,32,0.5)] hidden sm:block" />
                <span className="pill-status">
                  <span className="material-symbols-outlined text-lg">verified</span>
                  Premium Grade Turf
                </span>
              </div>
            </div>
            <div className="glass-card !p-4 sm:!p-6 md:!p-8 text-right md:min-w-[200px] lg:min-w-[240px] md:scale-110 origin-bottom-right self-end">
              <span className="label-classic !ml-0 mb-1 sm:mb-2">Starts From</span>
              <span className="text-3xl sm:text-4xl font-black text-primary italic text-stroke">
                ₹{new Intl.NumberFormat().format(minPrice)}
                <small className="text-white text-[10px] sm:text-xs font-normal not-italic ml-1 sm:ml-2 tracking-tighter">/HR</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {(galleryImages.length > 0 || amenities.length > 0) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          {galleryImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {galleryImages.map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={arena.name}
                  className="w-full h-28 sm:h-32 object-cover rounded-xl sm:rounded-2xl border border-white/10"
                />
              ))}
            </div>
          )}
          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {amenities.map((a) => (
                <span
                  key={a.id}
                  className="pill-status !py-2 !px-4 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">{a.icon}</span>
                  {a.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 -mt-4 sm:-mt-8">
        <BookingSystem
          arenaId={arena.id} 
          initialDate={selectedDate} 
          csrfToken={csrfToken} 
          initialCustomerName={currentUser?.name || ''}
          initialCustomerMobile={currentUser?.customer_mobile || ''}
          initialCustomerEmail={currentUser?.email || ''}
        />
      </div>
    </div>
  );
}
