export interface CompareAssessmentResponsesInputDTO {
  /** Tenant — from authenticated JWT (ADR-0025). */
  professionalProfileId: string;
  /**
   * ID of the baseline (earlier) AssessmentResponse.
   * Must belong to the same tenant.
   */
  baselineResponseId: string;
  /**
   * ID of the current (more recent) AssessmentResponse.
   * Must belong to the same tenant.
   */
  currentResponseId: string;
}
