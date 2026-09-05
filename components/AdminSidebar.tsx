'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

type AdminSidebarProps = {
  role: string | null;
  arenaId: number | null;
};

type NavItem = { href: string; label: string; match: string };

// The single source of truth for admin navigation — used to be split
// between components/Header.tsx's top nav and, for super_admin, a second
// left-hand tab strip on the dashboard page itself. Both are gone now;
// this is the one left-hand menu every /fg-admin/* page shares (rendered
// from app/fg-admin/layout.tsx).
function navItemsForRole(role: string | null): NavItem[] {
  if (role === 'super_admin') {
    return [
      { href: '/fg-admin/platform/super-admin', label: 'Dashboard', match: '/super-admin' },
      { href: '/fg-admin/platform/arenas', label: 'Arenas', match: '/arenas' },
      { href: '/fg-admin/platform/bookings', label: 'Bookings', match: '/bookings' },
      { href: '/fg-admin/platform/cancellations', label: 'Cancellations', match: '/cancellations' },
      { href: '/fg-admin/platform/reviews', label: 'Reviews', match: '/reviews' },
      { href: '/fg-admin/platform/slots', label: 'Pricing', match: '/slots' },
      { href: '/fg-admin/platform/reports', label: 'Reports', match: '/reports' },
      { href: '/fg-admin/platform/approvals', label: 'Approvals', match: '/approvals' },
      { href: '/fg-admin/platform/audit-logs', label: 'Audit Logs', match: '/audit-logs' },
      { href: '/fg-admin/platform/users', label: 'Users', match: '/users' },
      { href: '/fg-admin/platform/notifications', label: 'Notifications', match: '/notifications' },
      { href: '/fg-admin/platform/gst-documents', label: 'GST Docs', match: '/gst-documents' },
      { href: '/fg-admin/platform/credentials', label: 'Credentials', match: '/credentials' },
      { href: '/fg-admin/platform/accountants', label: 'Accountants', match: '/accountants' },
      { href: '/fg-admin/platform/super-admin?tab=settings', label: 'Settings', match: '/super-admin' },
    ];
  }
  if (role === 'arena_admin') {
    return [
      { href: '/fg-admin/platform/dashboard', label: 'Dashboard', match: '/dashboard' },
      { href: '/fg-admin/platform/bookings', label: 'Bookings', match: '/bookings' },
      { href: '/fg-admin/platform/cancellations', label: 'Cancellations', match: '/cancellations' },
      { href: '/fg-admin/platform/slots', label: 'Pricing', match: '/slots' },
      { href: '/fg-admin/platform/reports', label: 'Reports', match: '/reports' },
      { href: '/fg-admin/platform/approvals', label: 'Approvals', match: '/approvals' },
    ];
  }
  if (role === 'manager') {
    return [
      { href: '/fg-admin/arena/dashboard', label: 'Dashboard', match: '/dashboard' },
      { href: '/fg-admin/arena/bookings', label: 'Bookings', match: '/bookings' },
      { href: '/fg-admin/arena/slots', label: 'Slots', match: '/slots' },
      { href: '/fg-admin/arena/notifications', label: 'Notifications', match: '/notifications' },
      { href: '/fg-admin/arena/settings', label: 'Settings', match: '/settings' },
    ];
  }
  if (role === 'security') {
    return [
      { href: '/fg-admin/security/scan', label: 'Scan Ticket', match: '/scan' },
      { href: '/fg-admin/security/verify', label: 'Verify', match: '/verify' },
    ];
  }
  if (role === 'accountant') {
    return [{ href: '/fg-admin/accountant/dashboard', label: 'Dashboard', match: '/accountant' }];
  }
  return [];
}

function isItemActive(item: NavItem, pathname: string, tabParam: string | null): boolean {
  if (!pathname.includes(item.match)) return false;
  // super_admin's Dashboard and Settings entries share the same pathname
  // (/fg-admin/platform/super-admin) and are only distinguished by ?tab= —
  // Settings is active only when that param is actually 'settings'.
  const isSettingsEntry = item.href.includes('tab=settings');
  if (isSettingsEntry) return tabParam === 'settings';
  if (item.match === '/super-admin' && tabParam === 'settings') return false;
  return true;
}

export default function AdminSidebar({ role, arenaId }: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const tabParam = searchParams.get('tab');

  const items = navItemsForRole(role);
  if (items.length === 0) return null;

  const linkClass = (active: boolean) =>
    `flex items-center px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
      active ? 'bg-primary/10 text-primary border border-primary/20' : 'text-white/60 border border-transparent hover:text-white hover:bg-white/[0.03]'
    }`;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-60 shrink-0 border-r border-white/5 min-h-[calc(100vh-5rem)] sticky top-20 self-start">
        <nav className="flex flex-col gap-1 p-4">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(isItemActive(item, pathname, tabParam))}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile toggle + drawer */}
      <div className="md:hidden sticky top-20 z-40 bg-dark/95 backdrop-blur-md border-b border-white/5">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-full flex items-center justify-between px-6 py-3 text-xs font-black uppercase tracking-widest text-white/80"
        >
          Menu
          <span className="material-symbols-outlined">{mobileOpen ? 'expand_less' : 'expand_more'}</span>
        </button>
        {mobileOpen && (
          <nav className="flex flex-col gap-1 p-4 pt-0 animate-fadeIn">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={linkClass(isItemActive(item, pathname, tabParam))}
              >
                {item.label}
              </Link>
            ))}
            {arenaId && (
              <p className="px-4 pt-2 text-[10px] text-white/30 uppercase tracking-widest">Arena ID: {arenaId}</p>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
