/**
 * Canonical domain error code registry.
 *
 * Every code that may appear on a `DomainError.code` field is declared here.
 * No module may use a raw string literal as an error code where a `DomainError`
 * is involved. See ADR-0008 (lifecycle invariants) and ADR-0045 (governance).
 *
 * Layering note:
 *   - Domain-layer codes originate inside aggregates and value objects.
 *   - Application-layer codes (ACCESS_DENIED) are produced by policy guards
 *     and cross-cutting middleware, but share this type space so that API
 *     boundary error handling is uniform and type-safe.
 */
export const ErrorCodes = {
  // ── Identity ──────────────────────────────────────────────────────────────
  /** Entity or aggregate root id is not a valid UUIDv4 (ADR-0047 §6). */
  INVALID_UUID: 'INVALID_UUID',

  // ── Temporal (ADR-0010) ───────────────────────────────────────────────────
  /** Generic UTC timestamp violation: unparseable date, non-UTC string, etc. */
  TEMPORAL_VIOLATION: 'TEMPORAL_VIOLATION',
  /** logicalDay is malformed or does not represent a real calendar date. */
  INVALID_LOGICAL_DAY: 'INVALID_LOGICAL_DAY',
  /** IANA timezone identifier is unrecognised or syntactically invalid. */
  INVALID_TIMEZONE: 'INVALID_TIMEZONE',

  // ── Financial (ADR-0047 — Money value object) ─────────────────────────────
  /** Money amount is not a non-negative integer in the smallest currency unit. */
  INVALID_MONEY_VALUE: 'INVALID_MONEY_VALUE',
  /** Currency code is not a valid 3-letter ISO 4217 uppercase code. */
  INVALID_CURRENCY: 'INVALID_CURRENCY',

  // ── State machine (ADR-0008) ──────────────────────────────────────────────
  /** A status transition that is not listed in the entity's state machine. */
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',

  // ── Concurrency (ADR-0006) ────────────────────────────────────────────────
  /**
   * Optimistic locking version mismatch: the aggregate was modified by another
   * process between the load and the save. This is a retryable condition —
   * propagate as-is to the presentation layer.
   */
  CONCURRENCY_CONFLICT: 'CONCURRENCY_CONFLICT',

  // ── Authorization (ADR-0024) — produced at the application layer ──────────
  /** The requesting actor does not have permission to perform the operation. */
  ACCESS_DENIED: 'ACCESS_DENIED',

  // ── General ───────────────────────────────────────────────────────────────
  /** A required aggregate or entity was not found in the repository. */
  NOT_FOUND: 'NOT_FOUND',
  /** A method argument fails a precondition that is not covered above. */
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
} as const;

/** Union of all valid error codes. Use this type on any `code` parameter. */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
