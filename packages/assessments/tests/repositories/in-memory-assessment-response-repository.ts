import type { IAssessmentResponseRepository } from '../../domain/repositories/assessment-response-repository.js';
import type { AssessmentResponse } from '../../domain/aggregates/assessment-response.js';

/**
 * In-memory implementation of IAssessmentResponseRepository for unit tests.
 *
 * Enforces create-only semantics: `save()` does not update existing records
 * (AssessmentResponse is immutable after creation, mirroring ADR-0005).
 *
 * All query methods enforce tenant isolation by filtering on `professionalProfileId`
 * (ADR-0025). Ordering by logicalDay descending is approximated by reverse
 * insertion order, which is sufficient for unit test assertions.
 */
export class InMemoryAssessmentResponseRepository implements IAssessmentResponseRepository {
  public items: AssessmentResponse[] = [];

  /**
   * Persists a new AssessmentResponse (create-only).
   * A second save for the same ID is silently ignored, maintaining immutability
   * and matching the idempotency requirement from the interface contract.
   */
  async save(response: AssessmentResponse): Promise<void> {
    const exists = this.items.some((r) => r.id === response.id);
    if (!exists) {
      this.items.push(response);
    }
  }

  async findById(id: string, professionalProfileId: string): Promise<AssessmentResponse | null> {
    return (
      this.items.find((r) => r.id === id && r.professionalProfileId === professionalProfileId) ??
      null
    );
  }

  async findByExecutionId(
    executionId: string,
    professionalProfileId: string,
  ): Promise<AssessmentResponse | null> {
    return (
      this.items.find(
        (r) => r.executionId === executionId && r.professionalProfileId === professionalProfileId,
      ) ?? null
    );
  }

  async findAllByClient(
    clientId: string,
    professionalProfileId: string,
  ): Promise<AssessmentResponse[]> {
    return this.items
      .filter((r) => r.clientId === clientId && r.professionalProfileId === professionalProfileId)
      .sort((a, b) => b.logicalDay.value.localeCompare(a.logicalDay.value));
  }

  async findAllByDeliverableAndClient(
    deliverableId: string,
    clientId: string,
    professionalProfileId: string,
  ): Promise<AssessmentResponse[]> {
    return this.items
      .filter(
        (r) =>
          r.deliverableId === deliverableId &&
          r.clientId === clientId &&
          r.professionalProfileId === professionalProfileId,
      )
      .sort((a, b) => b.logicalDay.value.localeCompare(a.logicalDay.value));
  }
}
