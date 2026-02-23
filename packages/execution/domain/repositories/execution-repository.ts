import type { IRepository, PageRequest, PaginatedResult } from '@fittrack/core';
import type { Execution } from '../aggregates/execution.js';

/**
 * Repository interface for the Execution aggregate root.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * Every query method that returns Execution records scoped to a professional
 * MUST accept `professionalProfileId` as a non-optional parameter.
 * Cross-tenant queries are never permitted.
 *
 * ## Immutability contract (ADR-0005)
 *
 * The infrastructure implementation MUST ensure that the underlying store
 * never allows UPDATE or DELETE on Execution rows. Only INSERT is permitted.
 * The `save()` method is INSERT-only for the Execution aggregate itself;
 * corrections may be appended (INSERT on the corrections table) but never
 * modified or deleted.
 *
 * ## ADR-0046 §4 — Session consumption atomicity
 *
 * The infrastructure implementation of `save()` MUST be called within
 * the same database transaction as `IAccessGrantPort.incrementSessionsConsumed()`.
 * This is a documented exception to the one-aggregate-per-transaction rule
 * (ADR-0003), explicitly required by ADR-0046 §4 to prevent session over-consumption.
 */
export interface IExecutionRepository extends IRepository<Execution> {
  /**
   * Finds an Execution by id, scoped to the given professional (ADR-0025).
   * Returns null when not found or when id belongs to a different tenant.
   */
  findByIdAndProfessionalProfileId(
    id: string,
    professionalProfileId: string,
  ): Promise<Execution | null>;

  /**
   * Returns a paginated list of Executions for the given professional,
   * ordered by `occurredAtUtc` descending (most recent first).
   */
  findManyByProfessionalProfileId(
    professionalProfileId: string,
    page: PageRequest,
  ): Promise<PaginatedResult<Execution>>;
}
