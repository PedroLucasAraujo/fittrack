import type { DomainResult } from '@fittrack/core';

/**
 * Port for cross-context AccessGrant operations required by the Execution
 * bounded context (ADR-0001 §3, ADR-0046).
 *
 * The Execution context must NEVER call the AccessGrant repository directly.
 * This port defines the two AccessGrant operations needed by `CreateExecution`:
 *
 * 1. **Validation**: All 5 ADR-0046 §3 checks in a single call.
 * 2. **Session increment**: Atomically increments `sessionsConsumed` (ADR-0046 §4).
 *
 * ## ADR-0046 §4 — Transactional atomicity (documented ADR-0003 exception)
 *
 * The infrastructure adapter implementing this port MUST execute
 * `executionRepository.save()` and `incrementSessionsConsumed()` within the
 * same database transaction. This is an explicit exception to the
 * one-aggregate-per-transaction rule (ADR-0003), required by ADR-0046 §4 to
 * prevent session over-consumption during the eventual consistency window.
 */
export interface IAccessGrantPort {
  /**
   * Performs all 5 ADR-0046 §3 validity checks:
   *
   * 1. `status === ACTIVE`
   * 2. `clientId` matches the requesting client
   * 3. `professionalProfileId` matches the tenant
   * 4. `validUntil` is null or not yet expired at `currentUtc`
   * 5. `sessionAllotment` is null or `sessionsConsumed < sessionAllotment`
   *
   * Returns `Right<void>` when all checks pass.
   * Returns `Left<DomainError>` (code: `EXECUTION.ACCESS_GRANT_INVALID`) on any failure.
   */
  validate(params: {
    accessGrantId: string;
    clientId: string;
    professionalProfileId: string;
    currentUtc: string;
  }): Promise<DomainResult<void>>;

  /**
   * Increments `sessionsConsumed` by 1.
   *
   * MUST be called within the same transaction as `IExecutionRepository.save()`
   * per ADR-0046 §4. The infrastructure adapter is responsible for transactional
   * atomicity. If incrementing causes `sessionsConsumed >= sessionAllotment`,
   * the AccessGrant transitions to EXPIRED (infrastructure concern).
   */
  incrementSessionsConsumed(accessGrantId: string): Promise<void>;
}
