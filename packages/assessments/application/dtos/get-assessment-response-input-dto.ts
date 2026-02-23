export interface GetAssessmentResponseInputDTO {
  /** Tenant — from authenticated JWT (ADR-0025). */
  professionalProfileId: string;
  /** ID of the AssessmentResponse to retrieve. */
  assessmentResponseId: string;
}
