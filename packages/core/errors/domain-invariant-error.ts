import { DomainError } from './domain-error';
import type { ErrorCode } from './error-codes';

/**
 * Raised when a domain invariant is violated within an aggregate root or
 * value object factory.
 *
 * Examples:
 *   - An invalid state transition is attempted (ADR-0008).
 *   - A value object receives a value outside its allowed range.
 *   - An entity is constructed with a field that violates a formal invariant.
 *
 * Invariant violations are programming-level errors when they occur inside
 * aggregate methods (the caller should have validated before calling), or
 * user-input errors when they originate from a factory that validates
 * external data. In both cases the type and `code` are the same; the calling
 * layer decides how to present the error.
 */
export class DomainInvariantError extends DomainError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>) {
    super(message, code, context);
  }
}
