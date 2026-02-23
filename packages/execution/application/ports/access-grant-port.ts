import type { DomainResult } from '@fittrack/core';

/**
 * Port for cross-context AccessGrant validation required by the Execution
 * bounded context (ADR-0001 §3, ADR-0046).
 *
 * The Execution context must NEVER call the AccessGrant repository directly.
 * This port exposes only the validation step of `CreateExecution`.
 *
 * The session-consumption increment (ADR-0046 §4) is handled separately
 * by `ICreateExecutionUnitOfWork`, which wraps both the Execution INSERT and
 * the `sessionsConsumed` increment in a single database transaction —
 * the documented exception to ADR-0003 §1.
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
}
