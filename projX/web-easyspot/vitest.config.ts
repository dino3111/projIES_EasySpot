import { defineConfig } from 'vitest/config';
import path from 'node:path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      recharts: path.resolve(__dirname, './src/test/recharts.mock.tsx'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        isolate: false,
        singleFork: true,
      },
    },
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
});
