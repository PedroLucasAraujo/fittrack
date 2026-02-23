/**
 * Supported field value types for AssessmentTemplate fields.
 *
 * Determines which variant of the FieldValue discriminated union is
 * valid for a given field's response (Q7 decision — Option B: typed union
 * without domain-level sensitivity classification; ADR-0028 §4).
 *
 * The platform does not prescribe WHAT to measure — it only enforces type
 * consistency between the prescribed field type and the recorded response.
 */
export const TemplateFieldType = {
  /** Numeric measurement. Value is a finite JavaScript number. */
  NUMBER: 'NUMBER',
  /** Free-form text. Value is a non-empty string. */
  TEXT: 'TEXT',
  /** Boolean flag (yes/no, present/absent). Value is a boolean. */
  BOOLEAN: 'BOOLEAN',
  /** Selection from a predefined list of options. Value must be one of the field's options[]. */
  SELECT: 'SELECT',
} as const;

export type TemplateFieldType = (typeof TemplateFieldType)[keyof typeof TemplateFieldType];
