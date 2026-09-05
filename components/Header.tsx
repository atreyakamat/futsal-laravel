'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ProfileMenu from './ProfileMenu';

type HeaderProps = {
  userId: number | null;
  role: string | null;
  arenaId: number | null;
  userName?: string | null;
};

export default function Header({ userId, role, arenaId, userName }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Do not show header on login pages
  const isLoginPage = pathname === '/login' || pathname === '/fg-admin/login' || pathname === '/verify-otp';
  if (isLoginPage) {
    return null;
  }

  // Role-based, not path-based: a staff member keeps their admin nav on
  // every page they visit (e.g. a booking QR page reached from an admin
  // bookings list), not just while under /fg-admin/*.
  const STAFF_ROLES = ['super_admin', 'arena_admin', 'manager', 'security', 'accountant'];
  const isAdminPath = STAFF_ROLES.includes(role || '');

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  // Render Admin Header — slim: branding + account menu only. All admin
  // navigation now lives in the persistent left sidebar (components/
  // AdminSidebar.tsx, rendered from app/fg-admin/layout.tsx) rather than
  // here, so there's exactly one nav surface instead of two.
  if (isAdminPath) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-dark/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-black italic tracking-tighter text-white group-hover:text-primary transition-colors">
              AGNEL<span className="text-primary">ARENA</span>
              <span className="text-[9px] uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-md ml-2 not-italic font-bold">
                ADMIN
              </span>
            </span>
          </Link>

          <ProfileMenu userId={userId} role={role} arenaId={arenaId} userName={userName} />
        </div>
      </header>
    );
  }

  // Render Customer Header
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-dark/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl font-black italic tracking-tighter text-white group-hover:text-primary transition-colors">
            AGNEL<span className="text-primary">ARENA</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          <Link href="/" className="text-xs font-black uppercase tracking-widest hover:text-primary text-white/60 transition-colors">
            Explore Arenas
          </Link>
          {userId && (role === 'customer' || role === 'player') ? (
            <Link href="/dashboard" className="text-xs font-black uppercase tracking-widest hover:text-primary text-white/60 transition-colors">
              My Bookings
            </Link>
          ) : null}
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {userId ? (
            <ProfileMenu userId={userId} role={role} arenaId={arenaId} userName={userName} />
          ) : (
            <Link href="/login" className="btn-primary !py-2.5 !px-6 !rounded-xl text-[10px]">
              PLAYER LOGIN
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden w-10 h-10 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-white"
        >
          <span className="material-symbols-outlined">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/5 bg-dark-soft px-6 py-8 space-y-6 animate-fadeIn">
          <nav className="flex flex-col gap-6">
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-black uppercase tracking-widest text-white/80 hover:text-primary"
            >
              Explore Arenas
            </Link>
            {userId && (role === 'customer' || role === 'player') ? (
              <Link 
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-black uppercase tracking-widest text-white/80 hover:text-primary"
              >
                My Bookings
              </Link>
            ) : null}
          </nav>

          <div className="pt-6 border-t border-white/5">
            {userId ? (
              <div className="space-y-3">
                <div className="px-2 py-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest">Signed in as</p>
                  <p className="text-sm font-black text-white truncate capitalize">{userName || role?.replace('_', ' ')}</p>
                  {arenaId && <p className="text-[10px] text-white/30 uppercase tracking-widest">Arena ID: {arenaId}</p>}
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="btn-secondary w-full !py-3 !rounded-xl text-center flex items-center justify-center gap-2 hover:!border-red-500/50 hover:!text-red-500"
                >
                  LOGOUT
                  <span className="material-symbols-outlined text-sm">logout</span>
                </button>
              </div>
            ) : (
              <Link 
                href="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary w-full block text-center !py-3 !rounded-xl"
              >
                PLAYER LOGIN
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
