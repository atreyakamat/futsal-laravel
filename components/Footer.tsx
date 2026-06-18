'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on login pages
  const isLoginPage = pathname === '/login' || pathname === '/fg-admin/login' || pathname === '/verify-otp';
  if (isLoginPage) {
    return null;
  }

  return (
    <footer className="bg-dark-soft border-t border-white/5 relative z-10 overflow-hidden">
      {/* Decorative Blur BG */}
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/5 blur-[120px] rounded-full translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2 space-y-6">
            <span className="text-2xl font-black italic tracking-tighter text-white">
              FUTSAL<span className="text-primary">GOA</span>
            </span>
            <p className="text-white/40 text-sm max-w-sm leading-relaxed font-medium">
              Goa's premier digital arena booking network. Experience premium synthetic pitches, instant slot locking, and seamless digital access controls.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-6">Explore</h4>
            <ul className="space-y-4">
              <li>
                <Link href="/" className="text-xs font-bold text-white/50 hover:text-primary transition-colors uppercase tracking-widest">
                  Explore Arenas
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-xs font-bold text-white/50 hover:text-primary transition-colors uppercase tracking-widest">
                  User Portal
                </Link>
              </li>
              <li>
                <Link href="/fg-admin/login" className="text-xs font-bold text-white/50 hover:text-primary transition-colors uppercase tracking-widest text-primary/80">
                  Admin Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-6">Legal</h4>
            <ul className="space-y-4">
              <li>
                <Link href="/privacy" className="text-xs font-bold text-white/50 hover:text-primary transition-colors uppercase tracking-widest">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-xs font-bold text-white/50 hover:text-primary transition-colors uppercase tracking-widest">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} FUTSALGOA. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              SYSTEM OPERATIONAL
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
