import type { ErrorCode } from './error-codes';

/**
 * Abstract base class for all domain errors.
 *
 * Extends the native `Error` so that:
 *   - `instanceof Error` checks pass in Express/Fastify error middleware.
 *   - Stack traces are captured automatically by the V8 engine.
 *   - `error.name` reflects the concrete subclass (e.g., "DomainInvariantError").
 *
 * All domain errors carry a typed `code` from `ErrorCodes` so that API
 * boundaries can map them to HTTP status codes without string matching on
 * `message`.
 *
 * The optional `context` map may contain non-PII diagnostic data (field names,
 * received values, aggregate IDs) to aid debugging. Never put personal data
 * here — see ADR-0037.
 */
export abstract class DomainError extends Error {
  readonly code: ErrorCode;
  readonly context?: Readonly<Record<string, unknown>>;

  protected constructor(
    message: string,
    code: ErrorCode,
    context?: Record<string, unknown>,
  ) {
    super(message);

    // Restore the prototype chain so that `instanceof DomainError` (and its
    // subclasses) works correctly after TypeScript down-compilation to ES5.
    Object.setPrototypeOf(this, new.target.prototype);

    // Reflect the concrete subclass name in stack traces and logs.
    this.name = this.constructor.name;

    this.code = code;
    this.context = context ? Object.freeze({ ...context }) : undefined;
  }
}
