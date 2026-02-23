export interface ListAssessmentResponsesInputDTO {
  /** Tenant — from authenticated JWT (ADR-0025). */
  professionalProfileId: string;
  /** Filter by client ID. Required for tenant-scoped listing. */
  clientId: string;
  /**
   * Optional: filter to responses from a specific Deliverable.
   * When provided, only assessments of that template version are returned —
   * useful for comparison across sessions with the same template.
   */
  deliverableId?: string;
}
