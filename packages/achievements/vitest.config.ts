import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@fittrack/core': path.resolve(__dirname, '../core/index.ts'),
      '@fittrack/execution': path.resolve(__dirname, '../execution/index.ts'),
      '@fittrack/metrics': path.resolve(__dirname, '../metrics/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['domain/**/*.ts', 'application/**/*.ts'],
      exclude: [
        '**/tests/**',
        'vitest.config.ts',
        'dist/**',
        'seed/**',
        // index.ts files are pure re-exports — no executable logic
        '**/index.ts',
        'application/dtos/**',
        'application/ports/**',
        'domain/events/**',
        'domain/repositories/**',
        'application/services/i-user-stats-query-service.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
