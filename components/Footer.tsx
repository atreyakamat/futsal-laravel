'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on login pages and protected admin/dashboard routes
  const isHidden =
    pathname === '/login' ||
    pathname === '/fg-admin/login' ||
    pathname === '/verify-otp' ||
    pathname.startsWith('/fg-admin') ||
    pathname.startsWith('/dashboard');
  if (isHidden) {
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
              AGNEL<span className="text-primary">ARENA</span>
            </span>
            <p className="text-white/40 text-sm max-w-sm leading-relaxed font-medium">
              Goa's premier digital arena booking network. Experience premium synthetic pitches, instant slot locking, and seamless digital access controls.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4 pt-2">
              <a href="https://instagram.com/agnelarenagoa" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/30 transition-all">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/30 transition-all">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
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
                <a href="mailto:contact@agnelarena.com" className="text-xs font-bold text-white/50 hover:text-primary transition-colors uppercase tracking-widest">
                  Contact Us
                </a>
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
              <li>
                <Link href="/about" className="text-xs font-bold text-white/50 hover:text-primary transition-colors uppercase tracking-widest">
                  About AgnelArena
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} AGNELARENA. ALL RIGHTS RESERVED.
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
