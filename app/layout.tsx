import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { readAuthUserId } from '@/lib/session';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'FutsalGoa | Premium Booking',
  description: 'Experience the future of futsal in Goa. Premium turfs, AI-powered booking.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const userId = await readAuthUserId();

  return (
    <html lang="en" className={`${spaceGrotesk.variable} scroll-smooth`}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="antialiased">
        <div className="noise" />
        <div className="mesh-bg" />
        
        <nav className="border-b border-white/5 py-6 sticky top-0 z-50 glass">
          <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <Link href="/" className="text-2xl font-black text-primary italic tracking-tighter hover:scale-105 transition-transform">
              FUTSAL<span className="text-white">GOA</span>
            </Link>
            
            <div className="flex gap-4 md:gap-8 items-center">
              {userId ? (
                <>
                  <Link href="/dashboard" className="text-[10px] font-bold tracking-[0.2em] text-white/40 hover:text-primary transition-colors uppercase">
                    MY BOOKINGS
                  </Link>
                  <form action="/api/auth/logout" method="POST" className="inline">
                    <button type="submit" className="px-6 py-2 glass rounded-full text-[10px] font-bold tracking-[0.2em] hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50 transition-all uppercase cursor-pointer">
                      LOGOUT
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="px-6 py-2 btn-primary rounded-full">
                  LOGIN
                </Link>
              )}
            </div>
          </div>
        </nav>

        <main>{children}</main>

        <footer className="py-10 border-t border-white/10 mt-20 bg-black/50">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Futsal Booking Platform. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
