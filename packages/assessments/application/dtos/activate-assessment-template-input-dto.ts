export interface ActivateAssessmentTemplateInputDTO {
  /** Tenant — from authenticated JWT (ADR-0025). */
  professionalProfileId: string;
  /** ID of the AssessmentTemplate to activate. */
  assessmentTemplateId: string;
}
