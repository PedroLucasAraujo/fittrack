export interface ArchiveAssessmentTemplateInputDTO {
  /** Tenant — from authenticated JWT (ADR-0025). */
  professionalProfileId: string;
  /** ID of the AssessmentTemplate to archive. */
  assessmentTemplateId: string;
}
