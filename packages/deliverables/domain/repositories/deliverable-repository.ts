import type { IRepository, PageRequest, PaginatedResult } from '@fittrack/core';
import type { Deliverable } from '../aggregates/deliverable.js';

/**
 * Repository interface for the Deliverable aggregate root.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * Every query method that returns Deliverable records scoped to a
 * professional MUST accept `professionalProfileId` as a non-optional
 * parameter. Cross-tenant queries are never permitted.
 *
 * ## Cross-context reads
 *
 * The Execution bounded context needs to verify that a Deliverable is
 * ACTIVE before recording an Execution against it. It does so through the
 * public API (ADR-0029), NOT by calling this repository directly (ADR-0001 §3).
 */
export interface IDeliverableRepository extends IRepository<Deliverable> {
  /**
   * Finds a Deliverable by id, scoped to the given professional (ADR-0025).
   * Returns null when not found or when id belongs to a different tenant.
   */
  findByIdAndProfessionalProfileId(
    id: string,
    professionalProfileId: string,
  ): Promise<Deliverable | null>;

  /**
   * Returns a paginated list of Deliverables for the given professional.
   */
  findManyByProfessionalProfileId(
    professionalProfileId: string,
    page: PageRequest,
  ): Promise<PaginatedResult<Deliverable>>;
}
