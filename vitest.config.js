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
    include: ['src/**/*.test.{js,jsx}'],
  },
});
