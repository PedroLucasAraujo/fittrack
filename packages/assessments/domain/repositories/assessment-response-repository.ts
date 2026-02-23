import type { AssessmentResponse } from '../aggregates/assessment-response.js';

/**
 * Repository interface for the AssessmentResponse aggregate.
 *
 * Follows the naming convention `I{AggregateName}Repository` (ADR-0047 §7).
 *
 * ## Immutability (ADR-0005 analogue)
 *
 * AssessmentResponse is immutable after creation. This repository exposes
 * only `save()` (create) and read methods. No update or delete operations
 * are provided — they must not exist on the infrastructure implementation.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * All query methods require `professionalProfileId` as a mandatory scoping
 * parameter. No cross-tenant data is ever returned.
 */
export interface IAssessmentResponseRepository {
  /**
   * Persists a new AssessmentResponse (create-only, never update).
   * Implementations must ensure idempotency on the (executionId) key
   * to prevent duplicate responses for the same Execution (ADR-0007).
   */
  save(response: AssessmentResponse): Promise<void>;

  /**
   * Finds an AssessmentResponse by ID, scoped to the given tenant.
   * Returns null when not found or when the record belongs to a different tenant.
   */
  findById(id: string, professionalProfileId: string): Promise<AssessmentResponse | null>;

  /**
   * Finds the AssessmentResponse associated with a specific Execution.
   * Returns null if no response has been recorded for that Execution.
   * Scoped to the given tenant for isolation (ADR-0025).
   */
  findByExecutionId(
    executionId: string,
    professionalProfileId: string,
  ): Promise<AssessmentResponse | null>;

  /**
   * Returns all AssessmentResponses for the given client under the given
   * professional, ordered by logicalDay descending.
   * Used for the historical comparison query and client progress view.
   */
  findAllByClient(clientId: string, professionalProfileId: string): Promise<AssessmentResponse[]>;

  /**
   * Returns all AssessmentResponses for the given Deliverable and client,
   * ordered by logicalDay descending.
   * Enables comparison of assessments using the same template (same deliverableId).
   */
  findAllByDeliverableAndClient(
    deliverableId: string,
    clientId: string,
    professionalProfileId: string,
  ): Promise<AssessmentResponse[]>;
}
