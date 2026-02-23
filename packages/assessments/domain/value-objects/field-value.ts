import type { TemplateFieldType } from '../enums/template-field-type.js';

/**
 * Discriminated union for assessment field response values (Q7 — Option B).
 *
 * ## Design rationale
 *
 * The platform does not interpret physiological data (ADR-0028 §4). The
 * FieldValue union enforces type consistency between the template field's
 * declared TemplateFieldType and the recorded response value without ascribing
 * clinical meaning to any value. This is analogous to how Money enforces
 * integer-cent arithmetic without interpreting what the amount represents.
 *
 * ## No ValueObject wrapper
 *
 * FieldValue is a plain discriminated union rather than a ValueObject class
 * because its structural shape IS the identity — there is no additional
 * validation state beyond the discriminant and the value. Factory functions
 * below construct values; the use case validates type matching before creation.
 *
 * ## LGPD Category A
 *
 * All field values are health data (ADR-0037 §1, Category A — Highest
 * sensitivity). Sensitivity is enforced at the persistence and API layers,
 * not here. The domain treats values as structurally typed but opaque.
 */

export interface NumberFieldValue {
  readonly type: 'NUMBER';
  /** Finite numeric measurement. The unit is defined on the template field. */
  readonly value: number;
}

export interface TextFieldValue {
  readonly type: 'TEXT';
  /** Free-form text response. Non-empty string. */
  readonly value: string;
}

export interface BooleanFieldValue {
  readonly type: 'BOOLEAN';
  /** Boolean flag. True or false. */
  readonly value: boolean;
}

export interface SelectFieldValue {
  readonly type: 'SELECT';
  /**
   * Selected option string. Must be one of the options[] defined on the
   * AssessmentTemplateField. Validated by the application layer before
   * AssessmentResponse creation.
   */
  readonly value: string;
}

/** Union of all valid field value variants. */
export type FieldValue = NumberFieldValue | TextFieldValue | BooleanFieldValue | SelectFieldValue;

// ── Factory helpers ──────────────────────────────────────────────────────────

export function numberFieldValue(value: number): NumberFieldValue {
  return { type: 'NUMBER', value };
}

export function textFieldValue(value: string): TextFieldValue {
  return { type: 'TEXT', value };
}

export function booleanFieldValue(value: boolean): BooleanFieldValue {
  return { type: 'BOOLEAN', value };
}

export function selectFieldValue(value: string): SelectFieldValue {
  return { type: 'SELECT', value };
}

// ── Type guards ──────────────────────────────────────────────────────────────

export function isNumberFieldValue(v: FieldValue): v is NumberFieldValue {
  return v.type === 'NUMBER';
}

export function isTextFieldValue(v: FieldValue): v is TextFieldValue {
  return v.type === 'TEXT';
}

export function isBooleanFieldValue(v: FieldValue): v is BooleanFieldValue {
  return v.type === 'BOOLEAN';
}

export function isSelectFieldValue(v: FieldValue): v is SelectFieldValue {
  return v.type === 'SELECT';
}

/**
 * Maps a FieldValue discriminant to the corresponding TemplateFieldType.
 * Used by the application layer to validate that a response value's type
 * matches the template field's declared fieldType.
 */
export function fieldValueMatchesType(value: FieldValue, expected: TemplateFieldType): boolean {
  return value.type === expected;
}
