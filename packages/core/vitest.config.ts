import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'either/**/*.ts',
        'errors/**/*.ts',
        'events/**/*.ts',
        'entities/**/*.ts',
        'value-objects/**/*.ts',
        'invariants/**/*.ts',
        'utils/**/*.ts',
        'collections/**/*.ts',
        'repositories/**/*.ts',
        'types/**/*.ts',
      ],
      exclude: [
        '**/__tests__/**',
        'vitest.config.ts',
        'dist/**',
        'index.ts',
        'either/domain-result.ts',
        'events/domain-event.ts',
        'repositories/i-repository.ts',
        'types/pagination.ts',
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
