'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ProfileMenuProps = {
  userId: number | null;
  role: string | null;
  arenaId: number | null;
  userName?: string | null;
};

export default function ProfileMenu({ userId, role, arenaId, userName }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-primary/30 transition-all"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-sm uppercase">
          {userName ? userName.slice(0, 2) : (role === 'super_admin' ? 'SA' : role === 'arena_admin' ? 'AA' : role === 'manager' ? 'MG' : role === 'security' ? 'SC' : 'US')}
        </div>
        <span className="hidden sm:block text-xs font-black uppercase tracking-widest text-white/80 truncate max-w-[100px]">
          {userName || role?.replace('_', ' ')}
        </span>
        <span className="material-symbols-outlined text-white/60 text-sm transition-transform duration-200 {open ? 'rotate-180' : ''}">
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 glass-card !p-3 rounded-2xl border border-white/10 shadow-2xl shadow-black/50 animate-fadeIn z-50">
          <div className="px-3 py-2 border-b border-white/5 mb-2">
            <p className="text-xs font-black text-white/40 uppercase tracking-widest">Signed in as</p>
            <p className="text-sm font-black text-white truncate capitalize">{userName || role?.replace('_', ' ')}</p>
            {arenaId && (
              <p className="text-[10px] text-white/30 uppercase tracking-widest">Arena ID: {arenaId}</p>
            )}
          </div>

          <nav className="space-y-1">
            {(role === 'customer' || role === 'player') && (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/80 hover:bg-white/[0.04] hover:text-primary transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <span className="material-symbols-outlined text-primary text-lg">dashboard</span>
                  My Bookings
                </Link>
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/80 hover:bg-white/[0.04] hover:text-primary transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <span className="material-symbols-outlined text-white/60 text-lg">person</span>
                  Profile
                </Link>
              </>
            )}

            {/* Staff roles (super_admin, manager, arena_admin, security) have
                no role-specific links here — the admin Header now shows
                their full nav on every page (see components/Header.tsx), so
                repeating those destinations in this dropdown would just be
                the same links twice. This menu stays account-only for them:
                "Signed in as" above, Logout below. */}

            <hr className="border-white/5 my-2" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Logout
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}