import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Only active when a DSN is actually configured — silently a no-op otherwise,
  // so this is safe to ship even before SENTRY_DSN is set in production.
  enabled: Boolean(process.env.SENTRY_DSN),
});
