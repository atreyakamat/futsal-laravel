'use client';

import { useEffect, useId } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

// Renders nothing at all when NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set —
// this is deliberately inert until both env vars (this one, and
// TURNSTILE_SECRET_KEY server-side) are configured, so the login flow keeps
// working exactly as before until the feature is actually turned on.
export default function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const containerId = `turnstile-${useId().replace(/:/g, '')}`;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;

    let widgetId: string | undefined;
    let cancelled = false;

    function render() {
      if (cancelled || !window.turnstile) return;
      const el = document.getElementById(containerId);
      if (!el) return;
      widgetId = window.turnstile.render(el, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    }

    if (window.turnstile) {
      render();
    } else {
      // The api.js <Script> below fires this once loaded; poll briefly in
      // case it loaded before this effect ran.
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          render();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, containerId]);

  if (!siteKey) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />
      <div id={containerId} />
    </>
  );
}
