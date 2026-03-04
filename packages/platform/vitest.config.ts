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
      include: ['domain/**/*.ts', 'application/**/*.ts', 'jobs/**/*.ts', 'shared/jobs/**/*.ts'],
      exclude: [
        '**/tests/**',
        'vitest.config.ts',
        'dist/**',
        'index.ts',
        'jobs/index.ts',
        'shared/jobs/index.ts',
        'shared/jobs/IScheduledJob.ts',
        'application/dtos/**',
        'application/ports/**',
        'domain/events/**',
        // Repository interfaces contain no executable code — only type declarations.
        // Infrastructure implementations live outside this package (ADR-0002).
        // If a concrete implementation is ever added here, remove this exclusion.
        'domain/repositories/**',
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
