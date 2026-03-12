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
        '**/tests/**',
        'vitest.config.ts',
        'dist/**',
        'index.ts',
        'application/dtos/**',
        'application/ports/**',
        'domain/events/**',
        'domain/repositories/**',
        'domain/index.ts',
        'domain/errors/index.ts',
        'domain/errors/invalid-baseline-value-error.ts',
        'domain/errors/invalid-target-value-error.ts',
        'domain/value-objects/index.ts',
        'domain/entities/index.ts',
        'domain/aggregates/index.ts',
        'application/index.ts',
        'application/use-cases/index.ts',
        'application/event-handlers/index.ts',
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
