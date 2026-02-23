import type { TemplateFieldType } from '../../domain/enums/template-field-type.js';

export interface AddTemplateFieldInputDTO {
  /** Tenant — from authenticated JWT (ADR-0025). */
  professionalProfileId: string;
  /** ID of the AssessmentTemplate to add the field to. */
  assessmentTemplateId: string;
  /** Human-readable label for the field. 1–100 chars. */
  label: string;
  /** Value type for this field. */
  fieldType: TemplateFieldType;
  /** Unit of measurement for NUMBER fields (e.g., "kg", "cm"). Null otherwise. */
  unit?: string | null;
  /** Whether a response to this field is required. Defaults to false. */
  required?: boolean;
  /**
   * Valid options for SELECT fields. Must have at least 2 elements.
   * Null or omitted for non-SELECT fields.
   */
  options?: string[] | null;
}
