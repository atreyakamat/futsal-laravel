import { defineConfig } from 'vitest/config';
import path from 'path';

// Using a basic config since we are just setting up React Testing Library with Next.js app router conventions.
export default defineConfig({
  plugins: [],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    // These aren't vitest suites — they're standalone scripts (self-invoking
    // async function + custom assert()/process.exit(), no describe/it) meant
    // to be run directly against a real dev database, not through vitest's
    // runner. Vitest 4 hard-fails any matched file with no recognized test
    // suite, and a top-level process.exit() inside one kills the whole
    // worker — so `npm test` was failing on all of these regardless of
    // whether their own logic passed. Excluded rather than rewritten since
    // converting them to real suites is a separate, larger task.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/integration/arena-admin-workflow.test.ts',
      'tests/integration/concurrency-race-conditions.test.ts',
      'tests/integration/real-db-transaction.test.ts',
      'tests/e2e/arena-admin-ui.test.ts',
      'tests/e2e/real-browser-mobile.test.ts',
      'tests/unit/cancellation-lifecycle.test.ts',
      'tests/unit/mobile-customer-details-static.test.ts',
      'tests/unit/multi-slot-domain-consistency.test.ts',
      'tests/unit/mutation-falsification.test.ts',
      'tests/unit/refund-decision-lifecycle.test.ts',
      'tests/unit/refund-panel-lifecycle.test.ts',
      'tests/unit/security-attendance-lifecycle.test.ts',
      'tests/unit/domain/booking-group.test.ts',
    ],
  },
});
