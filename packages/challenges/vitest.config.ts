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
      include: ['domain/**/*.ts'],
      exclude: [
        '**/tests/**',
        'vitest.config.ts',
        'dist/**',
        'index.ts',
        'domain/events/**',
        'domain/repositories/**',
        'domain/services/**',
        'domain/index.ts',
        'domain/errors/index.ts',
        'domain/errors/challenge-error-codes.ts',
        'domain/value-objects/index.ts',
        'domain/aggregates/index.ts',
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
