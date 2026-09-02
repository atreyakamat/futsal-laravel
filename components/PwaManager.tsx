'use client';

import { useEffect, useState } from 'react';

type PwaManagerProps = {
  userId: number | null;
  role: string | null;
  csrfToken: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const INSTALL_DISMISSED_KEY = 'fg_pwa_install_dismissed';
const IOS_INSTALL_DISMISSED_KEY = 'fg_pwa_ios_install_dismissed';
const PUSH_DISMISSED_KEY = 'fg_push_prompt_dismissed';

// iOS Safari has never fired `beforeinstallprompt` (no Apple support for the
// API) and has no programmatic install trigger at all — the only way to add
// to home screen is the user manually tapping Share > Add to Home Screen. So
// the existing install banner, which waits for that event, never appears on
// iPhone/iPad. This detects iOS Safari specifically (excluding Chrome/Firefox
// on iOS, which wrap the same WebKit but still can't install either — kept
// simple by just checking "not already standalone" below) to show instructions
// instead of a broken "Install" button that would have nothing to call.
function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Registers the service worker (required for both installability and push),
 * and offers two independent, dismissible prompts:
 *  - "Install app" — driven by the browser's beforeinstallprompt event.
 *  - "Enable notifications" — only offered once someone is logged in
 *    (customer or staff), since a subscription has to be filed under a
 *    real owner (see app/api/push/subscribe/route.ts). Both no-op quietly
 *    when unsupported (Safari has no beforeinstallprompt; push needs
 *    NEXT_PUBLIC_VAPID_PUBLIC_KEY configured) — same "safe before it's
 *    configured" pattern as SupportWidget.
 */
const STAFF_ROLES = ['super_admin', 'admin', 'arena_admin', 'manager'];

export default function PwaManager({ userId, role, csrfToken }: PwaManagerProps) {
  const isStaff = !!role && STAFF_ROLES.includes(role);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIosInstallBanner, setShowIosInstallBanner] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((err) => console.error('[PWA] Service worker registration failed:', err));
  }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (isStandalone) return;
    if (localStorage.getItem(INSTALL_DISMISSED_KEY)) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setShowInstallBanner(false));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (isStandalone) return;
    if (localStorage.getItem(IOS_INSTALL_DISMISSED_KEY)) return;
    if (!isIosSafari()) return;

    setShowIosInstallBanner(true);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(PUSH_DISMISSED_KEY)) return;

    setShowPushBanner(true);
  }, [userId]);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setShowInstallBanner(false);
    setInstallEvent(null);
  };

  const dismissInstall = () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    setShowInstallBanner(false);
  };

  const dismissIosInstall = () => {
    localStorage.setItem(IOS_INSTALL_DISMISSED_KEY, '1');
    setShowIosInstallBanner(false);
  };

  const handleEnableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      setShowPushBanner(false);
      if (permission !== 'granted') return;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(subscription.toJSON()),
      });
    } catch (err) {
      console.error('[PWA] Push subscription failed:', err);
    }
  };

  const dismissPush = () => {
    localStorage.setItem(PUSH_DISMISSED_KEY, '1');
    setShowPushBanner(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-4 pointer-events-none">
      {showInstallBanner && (
        <div className="pointer-events-auto w-full max-w-md rounded-xl border border-white/10 bg-dark/95 backdrop-blur-md shadow-2xl p-4 flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Install AgnelArena</p>
            <p className="text-xs text-white/60">Add to your home screen for faster bookings.</p>
          </div>
          <button
            onClick={handleInstall}
            className="text-xs font-bold px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            Install
          </button>
          <button onClick={dismissInstall} aria-label="Dismiss" className="text-white/40 hover:text-white/70 flex-shrink-0 px-1">
            ✕
          </button>
        </div>
      )}

      {showIosInstallBanner && (
        <div className="pointer-events-auto w-full max-w-md rounded-xl border border-white/10 bg-dark/95 backdrop-blur-md shadow-2xl p-4 flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Install AgnelArena</p>
            <p className="text-xs text-white/60">
              Tap <span className="material-symbols-outlined align-middle text-sm">ios_share</span> Share, then &quot;Add to Home Screen&quot;.
            </p>
          </div>
          <button onClick={dismissIosInstall} aria-label="Dismiss" className="text-white/40 hover:text-white/70 flex-shrink-0 px-1">
            ✕
          </button>
        </div>
      )}

      {showPushBanner && (
        <div className="pointer-events-auto w-full max-w-md rounded-xl border border-white/10 bg-dark/95 backdrop-blur-md shadow-2xl p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Turn on notifications</p>
            <p className="text-xs text-white/60">
              {isStaff ? 'Get notified the moment a new booking comes in.' : 'Get a reminder 30 minutes before your slot.'}
            </p>
          </div>
          <button
            onClick={handleEnableNotifications}
            className="text-xs font-bold px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            Enable
          </button>
          <button onClick={dismissPush} aria-label="Dismiss" className="text-white/40 hover:text-white/70 flex-shrink-0 px-1">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
