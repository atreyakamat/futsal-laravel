import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { readAuthUserId } from '@/lib/session';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FutsalGoa | Premium Turf Booking',
  description: 'Book the best futsal turfs in Goa instantly.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userId = await readAuthUserId();

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className={`${spaceGrotesk.className} antialiased overflow-x-hidden min-h-screen`}>
        <div className="noise" />
        <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-dark/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <span className="material-symbols-outlined text-black font-black">sports_soccer</span>
              </div>
              <span className="text-xl font-black italic tracking-tighter uppercase">
                Futsal<span className="text-primary">Goa</span>
              </span>
            </Link>

            <div className="flex items-center gap-8">
              <div className="hidden md:flex items-center gap-6">
                <Link href="/#arenas" className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-primary transition-colors">Arenas</Link>
                <Link href="/fg-admin/platform/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-primary transition-colors">Admin</Link>
              </div>
              
              {userId ? (
                <Link href="/dashboard" className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all duration-500">
                  Dashboard
                </Link>
              ) : (
                <Link href="/login" className="px-6 py-2.5 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all duration-500 shadow-[0_0_20px_rgba(0,183,255,0.3)]">
                  Join Now
                </Link>
              )}
            </div>
          </div>
        </nav>

        <main className="pt-20">
          {children}
        </main>

        <footer className="py-20 border-t border-white/5 bg-black">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-12 mb-20">
              <div className="col-span-2">
                <Link href="/" className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-black text-sm font-black">sports_soccer</span>
                  </div>
                  <span className="text-lg font-black italic tracking-tighter uppercase">
                    Futsal<span className="text-primary">Goa</span>
                  </span>
                </Link>
                <p className="text-white/20 text-sm max-w-sm leading-relaxed">
                  Goa's premier futsal facility management and booking platform. Elevating the game through technology and premium turfs.
                </p>
              </div>
              
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-6 italic">Platform</p>
                <div className="flex flex-col gap-4">
                  <Link href="/#arenas" className="text-xs text-white/40 hover:text-primary transition-colors">Find Arenas</Link>
                  <Link href="/login" className="text-xs text-white/40 hover:text-primary transition-colors">User Login</Link>
                  <Link href="/fg-admin/platform/login" className="text-xs text-white/40 hover:text-primary transition-colors">Admin Portal</Link>
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-6 italic">Support</p>
                <div className="flex flex-col gap-4">
                  <Link href="/privacy" className="text-xs text-white/40 hover:text-primary transition-colors">Privacy Policy</Link>
                  <Link href="/terms" className="text-xs text-white/40 hover:text-primary transition-colors">Terms of Service</Link>
                  <a href="mailto:support@futsalgoa.com" className="text-xs text-white/40 hover:text-primary transition-colors">Contact Us</a>
                </div>
              </div>

              {/* Hidden Admin Selector - Only visible on hover of footer text */}
              <div className="opacity-0 hover:opacity-100 transition-opacity duration-300 absolute bottom-8 right-8 bg-black/80 p-4 rounded-lg backdrop-blur-sm border border-white/10">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-3">Admin Access</p>
                <div className="flex flex-col gap-2">
                  <Link href="/fg-admin/platform/super-admin-login" className="text-[9px] text-primary hover:text-white transition-colors font-bold">Super Admin</Link>
                  <Link href="/fg-admin/platform/login" className="text-[9px] text-primary hover:text-white transition-colors font-bold">Arena Admin</Link>
                  <Link href="/fg-admin/platform/login" className="text-[9px] text-primary hover:text-white transition-colors font-bold">Security</Link>
                </div>
              </div>
            </div>
            
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest">
                © {new Date().getFullYear()} FutsalGoa. Created with passion for the beautiful game.
              </p>
              <div className="flex gap-6">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-primary/30 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-sm text-white/20">language</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-primary/30 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-sm text-white/20">share</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
