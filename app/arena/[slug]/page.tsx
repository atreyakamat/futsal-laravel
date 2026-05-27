import { getArenaBySlug, getArenaPricing } from '@/lib/domain';
import BookingSystem from '@/components/BookingSystem';
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
  const minPrice = pricing.length > 0 ? Math.min(...pricing.map(p => Number(p.price))) : 500;
  const selectedDate = typeof resolvedSearchParams.date === 'string' ? resolvedSearchParams.date : new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <section className="relative h-[50vh] min-h-[400px] flex items-end pb-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={arena.cover_image || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=1920'}
            className="w-full h-full object-cover scale-105"
            alt={arena.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/60 to-transparent" />
          <div className="absolute inset-0 hero-gradient opacity-80" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div>
              <Link
                href="/"
                className="btn-secondary !py-2 !px-4 !rounded-full mb-8 inline-flex items-center gap-2 group"
              >
                <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">
                  arrow_back
                </span>
                BACK TO EXPLORE
              </Link>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 italic">{arena.name}</h1>
              <div className="flex flex-wrap items-center gap-6">
                <span className="flex items-center gap-2.5 text-white/60 font-black uppercase tracking-widest text-xs">
                  <span className="material-symbols-outlined text-primary text-xl">location_on</span>
                  {arena.address}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shadow-[0_0_10px_rgba(13,242,32,0.5)]" />
                <span className="pill-status">
                  <span className="material-symbols-outlined text-lg">verified</span>
                  Premium Grade Turf
                </span>
              </div>
            </div>
            <div className="glass-card !p-8 text-right md:min-w-[240px] scale-110 origin-bottom-right">
              <span className="label-classic !ml-0 mb-2">Starts From</span>
              <span className="text-4xl font-black text-primary italic text-stroke">
                ₹{new Intl.NumberFormat().format(minPrice)}
                <small className="text-white text-xs font-normal not-italic ml-2 tracking-tighter">/HR</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Booking UI */}
      <div className="relative z-10 -mt-8">
        <BookingSystem arenaId={arena.id} initialDate={selectedDate} />
      </div>
    </div>
  );
}
