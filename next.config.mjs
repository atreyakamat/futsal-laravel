import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // pdfkit reads its font data files (Helvetica.afm etc.) from disk at
  // runtime, which Next's standalone-build file tracer can't see on its own
  // (it's a dynamic fs read inside a dependency, not a static import) — so
  // every route that generates a PDF ticket needs this explicitly, or the
  // standalone build silently omits the font files and PDF generation
  // throws ENOENT in production.
  outputFileTracingIncludes: {
    '/api/bookings/download': ['./node_modules/pdfkit/js/data/**/*'],
    '/api/ticket/[ticketId]': ['./node_modules/pdfkit/js/data/**/*'],
    '/booking/ticket/[ref]': ['./node_modules/pdfkit/js/data/**/*'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  }
};

// withSentryConfig is a no-op passthrough for error reporting when
// SENTRY_DSN isn't set. Source map upload is disabled outright — it's the
// part that talks to Sentry's release API at build time, and if the org/
// project/token don't line up exactly it hard-fails the entire production
// build (this took the site's build down once already). Error capture
// (Sentry.captureException in the error boundaries / route catch blocks)
// works completely independently of this and needs none of it.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  disableLogger: true,
  widenClientFileUpload: false,
  automaticVercelMonitors: false,
  sourcemaps: {
    disable: true,
  },
  // sourcemaps.disable only stops the upload — release *creation* is a
  // separate CLI call (`sentry-cli releases new`) that still ran and still
  // hard-failed the build. Disable it outright too; nothing here is needed
  // for runtime error capture to work.
  release: {
    create: false,
    finalize: false,
    inject: false,
  },
});