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
      <section className="relative h-[40vh] min-h-[300px] flex items-end pb-12 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0 scale-110">
          <img
            src={arena.cover_image || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=1920'}
            className="w-full h-full object-cover blur-[2px] opacity-40"
            alt={arena.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/80 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-gray-500 text-xs font-bold tracking-widest uppercase hover:text-primary transition-colors mb-6 group"
              >
                <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">
                  arrow_back
                </span>
                Back to Arenas
              </Link>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4">{arena.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                  <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                  {arena.address}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="flex items-center gap-1.5 text-gray-400 font-medium uppercase tracking-wider text-[10px]">
                  <span className="material-symbols-outlined text-primary text-lg">verified</span>
                  FIFA Approved Turf
                </span>
              </div>
            </div>
            <div className="glass p-6 rounded-3xl text-right md:min-w-[200px]">
              <span className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Current Pricing</span>
              <span className="text-3xl font-black text-primary italic">
                ₹{new Intl.NumberFormat().format(minPrice)}
                <small className="text-white text-xs font-normal not-italic ml-1">/HR</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Booking UI */}
      <BookingSystem arenaId={arena.id} initialDate={selectedDate} />
    </div>
  );
}
