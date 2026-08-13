import * as Sentry from '@sentry/nextjs';

/**
 * Reports a server-side error (typically from an API route's own catch
 * block, where the exception is caught and handled — never re-thrown — so
 * Sentry's automatic instrumentation never sees it on its own). No-ops
 * safely if SENTRY_DSN isn't configured.
 *
 * Only wired into the highest-value routes so far (payment callback, refund,
 * venue-payment confirmation, booking cancel) — the same pattern should be
 * applied to other routes' catch blocks over time, not just these.
 */
export function reportServerError(err: unknown, context: Record<string, unknown> = {}) {
  console.error('[ServerError]', context, err);
  Sentry.captureException(err, { extra: context });
}
