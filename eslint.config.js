import tseslint from 'typescript-eslint';

export default tseslint.config(
  // ── Global ignores ──────────────────────────────────────────────────────────
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
  },

  // ── TypeScript base rules ───────────────────────────────────────────────────
  ...tseslint.configs.recommended,

  // ── Project-wide rules ──────────────────────────────────────────────────────
  {
    files: ['packages/**/*.ts'],
    rules: {
      // §2.3 TypeScript safety — prevent type-system escape hatches
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Prevent unused variables (allow underscore-prefixed intentional ignores)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Disallow empty functions (except constructors for DI)
      '@typescript-eslint/no-empty-function': [
        'error',
        { allow: ['constructors'] },
      ],

      // Prevent fallthrough in switch statements (status machines: ADR-0008, ADR-0046)
      'no-fallthrough': 'error',

      // Prevent var usage — let/const only
      'no-var': 'error',

      // Prefer const for immutable bindings (aligns with immutability invariants)
      'prefer-const': 'error',

      // Prevent debugger/console in production code
      'no-debugger': 'error',
      'no-console': 'warn',
    },
  },

  // ── Domain and application layer: stricter rules ────────────────────────────
  {
    files: [
      'packages/**/domain/**/*.ts',
      'packages/**/application/**/*.ts',
    ],
    rules: {
      // §2.2 Financial safety (ADR-0004): restrict floating-point functions
      // in domain/application layers. All monetary values must use integer cents
      // via the Money value object.
      'no-restricted-globals': [
        'error',
        {
          name: 'parseFloat',
          message:
            'parseFloat is prohibited in domain/application layers. Use integer cents via Money value object (ADR-0004).',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Number',
          property: 'parseFloat',
          message:
            'Number.parseFloat is prohibited in domain/application layers. Use integer cents via Money value object (ADR-0004).',
        },
      ],

      // §2.3 Any in domain layer is an error, not a warning
      '@typescript-eslint/no-explicit-any': 'error',

      // Non-null assertions in domain code bypass safety checks (ADR-0046 validity checks)
      '@typescript-eslint/no-non-null-assertion': 'error',

      // No console in domain/application (ADR-0037: no PII in logs)
      'no-console': 'error',
    },
  },

  // ── Test files: relaxed rules ───────────────────────────────────────────────
  {
    files: [
      'packages/**/__tests__/**/*.ts',
      'packages/**/tests/**/*.ts',
      'packages/**/*.test.ts',
      'packages/**/*.spec.ts',
    ],
    rules: {
      // Tests may use any for mocks and fixtures
      '@typescript-eslint/no-explicit-any': 'off',

      // Tests use non-null assertions after known-good setup
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Tests may use console for debugging
      'no-console': 'off',
    },
  },
);
