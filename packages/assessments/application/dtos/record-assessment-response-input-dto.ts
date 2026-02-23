import type { FieldValue } from '../../domain/value-objects/field-value.js';

export interface FieldResponseInputDTO {
  /** ID of the template field being answered. */
  fieldId: string;
  /** Typed value for this field. Must match the field's TemplateFieldType. */
  value: FieldValue;
}

export interface RecordAssessmentResponseInputDTO {
  /** Tenant — from authenticated JWT (ADR-0025). */
  professionalProfileId: string;
  /**
   * ID of the CONFIRMED Execution this response belongs to.
   * The Execution must reference a PHYSIOLOGICAL_ASSESSMENT Deliverable.
   */
  executionId: string;
  /**
   * ISO 8601 UTC timestamp of when this response record was created.
   * Typically the current system time (ADR-0010).
   */
  createdAtUtc: string;
  /**
   * Field responses. The application layer validates that:
   * - Each fieldId exists in the Deliverable's template snapshot.
   * - Each value type matches the field's TemplateFieldType.
   * - All required fields have a response.
   * - No fieldId is duplicated (also enforced by the domain).
   */
  responses: FieldResponseInputDTO[];
}
