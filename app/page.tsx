import { getActiveArenas } from '@/lib/domain';
import ArenaGrid from '@/components/ArenaGrid';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const arenas = await getActiveArenas();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,183,255,0.1)_0,transparent_70%)]" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-block px-4 py-1.5 mb-8 rounded-full border border-primary/20 bg-primary/5">
            <span className="text-[10px] font-bold tracking-[0.3em] text-primary uppercase">The Future of Agnel</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter italic uppercase leading-[0.9]">
            Play <span className="text-primary text-stroke">Better</span><br />
            Book <span className="text-primary">Faster.</span>
          </h1>
          
          <p className="max-w-xl mx-auto text-white/40 text-lg md:text-xl font-medium mb-12">
            Experience the future of turf booking in Goa. Premium facilities, instant AI-powered reservations.
          </p>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <a href="#arenas" className="px-10 py-4 btn-primary rounded-full text-sm">
              EXPLORE ARENAS
            </a>
            <a href="/login" className="px-10 py-4 glass rounded-full text-sm font-bold tracking-widest hover:bg-white/5 transition-all">
              USER LOGIN
            </a>
          </div>
        </div>
      </section>

      {/* Arenas Section */}
      <div id="arenas" className="relative">
        <ArenaGrid arenas={arenas} />
      </div>

      {/* Features / Why Choose Us Section */}
      <section className="py-32 border-t border-white/5 bg-white/[0.01] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,183,255,0.03)_0,transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] block mb-4">Why AgnelArena</span>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic">
              ENGINEERED FOR <span className="text-primary text-stroke">THE PITCH</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-card flex flex-col justify-between group hover:border-primary/30 transition-all duration-300">
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">lock_clock</span>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight italic">Instant Slot Locking</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  No double bookings, ever. Our real-time scheduling engine immediately locks selected slots during checkout so you never lose your game time.
                </p>
              </div>
            </div>

            <div className="glass-card flex flex-col justify-between group hover:border-primary/30 transition-all duration-300">
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">qr_code_2</span>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight italic">Digital Pass Entry</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Seamless gate access. Every confirmed booking automatically generates a verified digital ticket containing a secure entry QR code scanned at the field.
                </p>
              </div>
            </div>

            <div className="glass-card flex flex-col justify-between group hover:border-primary/30 transition-all duration-300">
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">credit_card</span>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight italic">Secure Payments</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Safe, end-to-end encrypted transactions via PayU checkout routing. Lock your slot, confirm payment, and get ticketed instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant Section */}
      <section className="py-32 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
                <span className="material-symbols-outlined text-primary text-3xl">smart_toy</span>
              </div>
              <h2 className="text-4xl font-black tracking-tighter italic uppercase mb-6">
                Meet your <span className="text-primary">AI Coach</span>
              </h2>
              <p className="text-white/40 text-lg leading-relaxed mb-10">
                Our advanced AI assistant helps you find the perfect arena, checks availability in real-time, and handles your bookings seamlessly. No more waiting, just playing.
              </p>
              <div className="flex gap-4">
                <div className="px-4 py-2 rounded-xl border border-white/10 bg-white/5">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white/20">Real-time</span>
                </div>
                <div className="px-4 py-2 rounded-xl border border-white/10 bg-white/5">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white/20">Instant</span>
                </div>
              </div>
            </div>
            
            <div className="glass-card !p-12 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
              <p className="text-white/60 italic text-lg leading-relaxed relative z-10 font-medium">
                "Finding a turf used to take 10 calls. Now I just chat with the assistant and it's done in 30 seconds. The premium experience Goa needed."
              </p>
              <div className="mt-8 flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20" />
                <div>
                  <p className="font-black text-sm uppercase italic">Rahul Fernandes</p>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Active Player</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            <div>
              <p className="text-4xl font-black italic mb-2">10+</p>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Premium Turfs</p>
            </div>
            <div>
              <p className="text-4xl font-black italic mb-2">5K+</p>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Active Users</p>
            </div>
            <div>
              <p className="text-4xl font-black italic mb-2">24/7</p>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">AI Assistant</p>
            </div>
            <div>
              <p className="text-4xl font-black italic mb-2">0.5s</p>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Booking Speed</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] block mb-4">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">
              FREQUENTLY ASKED <span className="text-primary">QUESTIONS</span>
            </h2>
          </div>

          <div className="space-y-6">
            <details className="group glass-card !p-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="font-bold text-sm uppercase tracking-wider group-hover:text-primary transition-colors">How do I access the arena?</h3>
                <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180 text-primary">expand_more</span>
              </summary>
              <div className="mt-4 text-white/40 text-xs md:text-sm leading-relaxed border-t border-white/5 pt-4">
                After checkout, you receive a digital ticket with a QR code. Security staff at the arena will scan this QR code to verify your booking and confirm your entry.
              </div>
            </details>

            <details className="group glass-card !p-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="font-bold text-sm uppercase tracking-wider group-hover:text-primary transition-colors">Can I cancel or reschedule my booking?</h3>
                <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180 text-primary">expand_more</span>
              </summary>
              <div className="mt-4 text-white/40 text-xs md:text-sm leading-relaxed border-t border-white/5 pt-4">
                Yes, slot changes or cancellation requests can be initiated from your Customer Dashboard. Requests are sent directly to the Arena Manager for review and approval.
              </div>
            </details>

            <details className="group glass-card !p-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="font-bold text-sm uppercase tracking-wider group-hover:text-primary transition-colors">What happens if a session is double booked?</h3>
                <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180 text-primary">expand_more</span>
              </summary>
              <div className="mt-4 text-white/40 text-xs md:text-sm leading-relaxed border-t border-white/5 pt-4">
                Our platform enforces transactional locking. Once a slot is selected and added to checkout, it is locked dynamically in the system database to prevent other users from selecting it.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-32">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black tracking-tighter italic uppercase mb-8">
            Still have <span className="text-primary">Questions?</span>
          </h2>
          <div className="glass-card">
            <div className="flex flex-col items-center gap-6">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">chat_bubble</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">
                Need help picking a slot or checking prices? Our AI assistant is here to help you 24/7.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* JSON-LD Local Business Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SportsActivityLocation',
            'name': 'AgnelArena',
            'description': 'Premium agnel turf booking platform in Goa with instant slot locking and digital QR ticketing.',
            'url': 'https://agnelarena.com',
            'address': {
              '@type': 'PostalAddress',
              'addressLocality': 'Goa',
              'addressCountry': 'IN'
            }
          })
        }}
      />
    </div>
  );
}
