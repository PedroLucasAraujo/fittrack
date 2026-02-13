import { DomainError } from './domain-error';
import { ErrorCodes } from './error-codes';

/**
 * Raised when optimistic locking detects a version mismatch on an aggregate
 * root save operation (ADR-0006).
 *
 * This means the aggregate was modified by another process between the time
 * it was loaded and the time the current process attempted to save it.
 *
 * This error is a **retryable condition**, not a validation failure:
 *   - At the presentation layer it maps to HTTP 409 Conflict.
 *   - The client should reload the aggregate and resubmit the operation.
 *   - For aggregates with a defined retry policy (Transaction, AccessGrant,
 *     RiskStatus), the application layer retries up to the configured limit
 *     before propagating this error. See ADR-0006 §4.
 */
export class ConcurrencyConflictError extends DomainError {
  constructor(aggregateType: string, aggregateId: string) {
    super(
      `Concurrency conflict on ${aggregateType}[${aggregateId}]: ` +
        'the aggregate was modified by another process. Reload and retry.',
      ErrorCodes.CONCURRENCY_CONFLICT,
      { aggregateType, aggregateId },
    );
  }
}
