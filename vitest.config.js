import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Unit tests target the framework-free utils extracted during the refactor.
// Alias mirrors jsconfig.json ("@/*" -> "./*") so `@/src/...` imports resolve.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(process.cwd(), '.') },
  },
  test: {
    environment: 'node',
    // Enables Testing Library's automatic DOM cleanup between component tests
    // (it registers an afterEach only when one is globally available).
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['./vitest.setup.js'],
    // apiConfig throws at import without this; utils that transitively pull in
    // apiClient (e.g. via a resolveUrl re-export) need a value to load in tests.
    env: { NEXT_PUBLIC_API_URL: 'http://localhost' },
  },
});
