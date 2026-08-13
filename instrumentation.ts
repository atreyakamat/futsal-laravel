export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captures errors thrown from React Server Component rendering / route
// handlers that Next.js's own instrumentation hook surfaces. Safe to import
// unconditionally — the underlying Sentry client no-ops when SENTRY_DSN
// isn't set (see sentry.server.config.ts / sentry.edge.config.ts).
export { captureRequestError as onRequestError } from '@sentry/nextjs';
