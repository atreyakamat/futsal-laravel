import { getActiveArenas } from '@/lib/domain';
import ArenaGrid from '@/components/ArenaGrid';

export default async function Home() {
  const arenas = await getActiveArenas();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-white/5">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center scale-105 transition-transform duration-1000" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=90')" }}
        />
        <div className="absolute inset-0 z-10 hero-overlay" />

        <div className="relative z-20 text-center px-6 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-8 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[10px] font-bold tracking-widest text-primary uppercase">Now Open in Pilar</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black leading-none mb-8 tracking-tighter">
            <span className="block">BOOK. PLAY.</span>
            <span className="text-primary block italic">DOMINATE.</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Experience the future of futsal in Goa. Premium turfs, AI-powered booking, and a professional atmosphere for true ballers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#arenas" className="px-10 py-5 bg-primary text-black rounded-full font-black text-sm tracking-widest shadow-2xl shadow-primary/40 hover:scale-105 transition-all active:scale-95">
              BOOK A TURF
            </a>
          </div>
        </div>

        {/* Decorative floating elements */}
        <div className="absolute bottom-10 left-10 hidden lg:block opacity-20">
          <div className="text-8xl font-black text-stroke italic">GOA</div>
        </div>
      </section>

      {/* Arenas Section */}
      <ArenaGrid arenas={arenas} />

      {/* Features Section */}
      <section className="py-32 border-t border-white/5 bg-surface relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <h2 className="text-center text-3xl font-black mb-20 tracking-tighter uppercase">
            The <span className="text-primary italic">FutsalGoa</span> Experience
          </h2>
          <div className="grid md:grid-cols-3 gap-16">
            <div className="space-y-6">
              <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center border-primary/20">
                <span className="material-symbols-outlined text-primary text-3xl">bolt</span>
              </div>
              <h3 className="text-xl font-bold">Instant Booking</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Lock your favorite slot in seconds with our high-speed booking engine. Real-time availability, zero lag.
              </p>
            </div>

            <div className="space-y-6">
              <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center border-primary/20">
                <span className="material-symbols-outlined text-primary text-3xl">verified</span>
              </div>
              <h3 className="text-xl font-bold">Pro Turfs</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                We maintain the highest standards for our fields, ensuring consistent bounce and player safety at all times.
              </p>
            </div>

            <div className="space-y-6">
              <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center border-primary/20">
                <span className="material-symbols-outlined text-primary text-3xl">smart_toy</span>
              </div>
              <h3 className="text-xl font-bold">AI Assistant</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Need help picking a slot or checking prices? Our AI assistant is here to help you 24/7.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
