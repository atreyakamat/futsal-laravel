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

  const isAdminPath = pathname.startsWith('/fg-admin');

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  // Render Admin Header
  if (isAdminPath) {
    const dashboardLink = role === 'super_admin' 
      ? '/fg-admin/platform/super-admin'
      : role === 'arena_admin'
      ? '/fg-admin/arena/dashboard'
      : role === 'security'
      ? '/fg-admin/security/scan'
      : '/fg-admin/login';

    return (
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-dark/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl font-black italic tracking-tighter text-white group-hover:text-primary transition-colors">
                AGNEL<span className="text-primary">ARENA</span>
                <span className="text-[9px] uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-md ml-2 not-italic font-bold">
                  ADMIN
                </span>
              </span>
            </Link>

            {/* Admin Nav Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              {role === 'super_admin' && (
                <>
                  <Link href="/fg-admin/platform/super-admin" className={`text-xs font-black uppercase tracking-widest hover:text-primary transition-colors ${pathname.includes('/super-admin') ? 'text-primary' : 'text-white/60'}`}>
                    Dashboard
                  </Link>
                  <Link href="/fg-admin/platform/arenas" className={`text-xs font-black uppercase tracking-widest hover:text-primary transition-colors ${pathname.includes('/arenas') ? 'text-primary' : 'text-white/60'}`}>
                    Arenas
                  </Link>
                  <Link href="/fg-admin/platform/bookings" className={`text-xs font-black uppercase tracking-widest hover:text-primary transition-colors ${pathname.includes('/bookings') ? 'text-primary' : 'text-white/60'}`}>
                    Bookings
                  </Link>
                  <Link href="/fg-admin/platform/approvals" className={`text-xs font-black uppercase tracking-widest hover:text-primary transition-colors ${pathname.includes('/approvals') ? 'text-primary' : 'text-white/60'}`}>
                    Approvals
                  </Link>
                </>
              )}
              {role === 'arena_admin' && (
                <>
                  <Link href="/fg-admin/arena/dashboard" className={`text-xs font-black uppercase tracking-widest hover:text-primary transition-colors ${pathname.endsWith('/dashboard') ? 'text-primary' : 'text-white/60'}`}>
                    Dashboard
                  </Link>
                  <Link href="/fg-admin/arena/bookings" className={`text-xs font-black uppercase tracking-widest hover:text-primary transition-colors ${pathname.includes('/bookings') ? 'text-primary' : 'text-white/60'}`}>
                    Bookings
                  </Link>
                  <Link href="/fg-admin/arena/slots" className={`text-xs font-black uppercase tracking-widest hover:text-primary transition-colors ${pathname.includes('/slots') ? 'text-primary' : 'text-white/60'}`}>
                    Slots
                  </Link>
                  <Link href="/fg-admin/arena/settings" className={`text-xs font-black uppercase tracking-widest hover:text-primary transition-colors ${pathname.includes('/settings') ? 'text-primary' : 'text-white/60'}`}>
                    Settings
                  </Link>
                </>
              )}
              {role === 'security' && (
                <>
                  <Link href="/fg-admin/security/scan" className={`text-xs font-black uppercase tracking-widest hover:text-primary transition-colors ${pathname.includes('/scan') ? 'text-primary' : 'text-white/60'}`}>
                    Scan Ticket
                  </Link>
                  <Link href="/fg-admin/security/verify" className={`text-xs font-black uppercase tracking-widest hover:text-primary transition-colors ${pathname.includes('/verify') ? 'text-primary' : 'text-white/60'}`}>
                    Verify
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <ProfileMenu userId={userId} role={role} arenaId={arenaId} userName={userName} />
          </div>
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
          {userId ? (
            role === 'customer' || role === 'player' ? (
              <Link href="/dashboard" className="text-xs font-black uppercase tracking-widest hover:text-primary text-white/60 transition-colors">
                My Bookings
              </Link>
            ) : (
              <Link
                href={
                  role === 'super_admin'
                    ? '/fg-admin/platform/super-admin'
                    : role === 'arena_admin'
                    ? '/fg-admin/arena/dashboard'
                    : '/fg-admin/login'
                }
                className="text-xs font-black uppercase tracking-widest hover:text-primary text-white/60 transition-colors text-primary"
              >
                Admin Panel
              </Link>
            )
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
            {userId ? (
              role === 'customer' || role === 'player' ? (
                <Link 
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-black uppercase tracking-widest text-white/80 hover:text-primary"
                >
                  My Bookings
                </Link>
              ) : (
                <Link 
                  href={
                    role === 'super_admin'
                      ? '/fg-admin/platform/super-admin'
                      : role === 'arena_admin'
                      ? '/fg-admin/arena/dashboard'
                      : '/fg-admin/login'
                  }
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-black uppercase tracking-widest text-primary"
                >
                  Admin Panel
                </Link>
              )
            ) : null}
          </nav>

          <div className="pt-6 border-t border-white/5">
            {userId ? (
              <div className="space-y-3">
                <div className="px-2 py-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest">Signed in as</p>
                  <p className="text-sm font-black text-white capitalize">{role?.replace('_', ' ')}</p>
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
