import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@fittrack/core': path.resolve(__dirname, '../core/index.ts'),
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
        '**/__tests__/**',
        'vitest.config.ts',
        'dist/**',
        '**/index.ts',
        'application/dtos/**',
        'application/ports/**',
        'domain/events/**',
        'domain/repositories/**',
        'domain/services/i-session-history-query.ts',
        'application/projections/i-professional-reputation-score-repository.ts',
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
