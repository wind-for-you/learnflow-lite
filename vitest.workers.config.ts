import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/ratelimit-d1.test.ts'],
    // These tests require wrangler's getPlatformProxy
    // Run them after installing dependencies
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
