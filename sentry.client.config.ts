import * as Sentry from '@sentry/nextjs';

// Sentry DSNs are safe to expose client-side by design (they only allow
// sending error reports, not reading data) — hence NEXT_PUBLIC_.
// Needed specifically so app/error.tsx and app/global-error.tsx (both client
// components) can actually report the errors they catch.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
});
