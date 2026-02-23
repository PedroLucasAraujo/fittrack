import type { AssessmentTemplate } from '../aggregates/assessment-template.js';

/**
 * Repository interface for the AssessmentTemplate aggregate.
 *
 * Follows the naming convention `I{AggregateName}Repository` (ADR-0047 §7).
 * Domain layer only — infrastructure implementations live in the infrastructure
 * package and are never imported by domain or application layers.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * All query methods that return tenant-scoped data require `professionalProfileId`
 * as a mandatory parameter. No method may return templates across tenants.
 *
 * ## Optimistic locking (ADR-0006)
 *
 * `save()` implementations must increment the aggregate's `version` field on
 * every write and enforce the version check to prevent lost updates.
 */
export interface IAssessmentTemplateRepository {
  /**
   * Persists a new AssessmentTemplate or updates an existing one.
   * Implementations must enforce optimistic locking (ADR-0006).
   */
  save(template: AssessmentTemplate): Promise<void>;

  /**
   * Finds an AssessmentTemplate by ID, scoped to the given tenant.
   * Returns null when not found or when the record belongs to a different
   * tenant (ADR-0025 §4 — cross-tenant access returns 404, not 403).
   */
  findById(id: string, professionalProfileId: string): Promise<AssessmentTemplate | null>;

  /**
   * Returns all AssessmentTemplates owned by the given professional,
   * ordered by createdAtUtc descending.
   */
  findAllByProfessional(professionalProfileId: string): Promise<AssessmentTemplate[]>;
}
