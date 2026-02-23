import type { Execution } from '../../domain/aggregates/execution.js';

/**
 * Unit-of-work port for the `CreateExecution` use case.
 *
 * ## Purpose
 *
 * ADR-0046 §4 requires `sessionsConsumed` to be incremented within the same
 * database transaction as the Execution INSERT (documented exception to
 * ADR-0003 §1). This port is the application-layer mechanism that enforces
 * this atomicity invariant without exposing infrastructure details.
 *
 * By wrapping both operations in a single method, the application layer
 * fulfils ADR-0003 §4 ("Starting a transaction") through a single,
 * infrastructure-delegated boundary.
 *
 * ## Infrastructure contract
 *
 * The infrastructure adapter implementing this port MUST:
 * 1. Open a single database transaction.
 * 2. INSERT the Execution record.
 * 3. Increment `sessionsConsumed` on the AccessGrant identified by
 *    `accessGrantId` (and transition the grant to EXPIRED if the allotment
 *    is now exhausted — ADR-0046 §4).
 * 4. Commit the transaction.
 * 5. Throw on any error (the use case will propagate it).
 */
export interface ICreateExecutionUnitOfWork {
  /**
   * Atomically persists the new Execution and increments `sessionsConsumed`
   * on the referenced AccessGrant within a single database transaction
   * (ADR-0046 §4 — documented exception to ADR-0003).
   *
   * @param execution   The CONFIRMED Execution to INSERT.
   * @param accessGrantId  The AccessGrant whose session counter to increment.
   */
  commitExecution(execution: Execution, accessGrantId: string): Promise<void>;
}
