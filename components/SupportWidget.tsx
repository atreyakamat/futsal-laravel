'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    fwSettings?: Record<string, unknown>;
    FreshworksWidget?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

/**
 * Freshdesk's official support widget — a floating "Get Help" bubble that
 * opens a ticket form. Renders nothing (and injects nothing) unless
 * NEXT_PUBLIC_FRESHDESK_WIDGET_ID is set, same "safe to ship before it's
 * configured" pattern as Sentry (sentry.client.config.ts) elsewhere in this
 * app — sign up for a free Freshdesk account, grab the widget ID from
 * Admin > Support Channels > Widgets in your Freshdesk portal, and set the
 * env var. Nothing else to change.
 */
export default function SupportWidget() {
  const widgetId = process.env.NEXT_PUBLIC_FRESHDESK_WIDGET_ID;

  useEffect(() => {
    if (!widgetId) return;
    if (document.getElementById('freshdesk-widget-script')) return;

    window.fwSettings = { widget_id: Number(widgetId) };
    const q: unknown[] = [];
    const stub = function (...args: unknown[]) {
      q.push(args);
    };
    stub.q = q;
    window.FreshworksWidget = window.FreshworksWidget || (stub as Window['FreshworksWidget']);

    const script = document.createElement('script');
    script.id = 'freshdesk-widget-script';
    script.async = true;
    script.src = `https://widget.freshworks.com/widgets/${widgetId}.js`;
    document.body.appendChild(script);
  }, [widgetId]);

  return null;
}

/** Opens the widget with the ticket form pre-filled — call from any
 * contextual "Get Help" button. No-ops silently if the widget isn't loaded
 * (not configured, or script still loading). */
export function openSupportTicket(prefill: { subject?: string; description?: string }) {
  if (typeof window === 'undefined' || !window.FreshworksWidget) return;
  window.FreshworksWidget('identify', 'ticketForm', {
    subject: prefill.subject,
    description: prefill.description,
  });
  window.FreshworksWidget('open');
}
