export interface RemoveTemplateFieldInputDTO {
  /** Tenant — from authenticated JWT (ADR-0025). */
  professionalProfileId: string;
  /** ID of the AssessmentTemplate to remove the field from. */
  assessmentTemplateId: string;
  /** ID of the field to remove. */
  fieldId: string;
}
