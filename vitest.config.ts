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
  },
});
