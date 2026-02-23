import type { FieldValue } from '../../domain/value-objects/field-value.js';

/**
 * Comparison result for a single field across two AssessmentResponses.
 *
 * The platform does not interpret what the delta means clinically (ADR-0028 §4).
 * Delta is computed structurally: numeric difference for NUMBER fields,
 * change indicator for all other types.
 */
export interface FieldComparisonDTO {
  /** ID of the template field. */
  fieldId: string;
  /** Baseline value (from the earlier assessment). Null if field was not answered in baseline. */
  baseline: FieldValue | null;
  /** Current value (from the more recent assessment). Null if field was not answered in current. */
  current: FieldValue | null;
  /**
   * Numeric delta for NUMBER fields: current.value - baseline.value.
   * Null for non-NUMBER fields or when either value is absent.
   * The platform does not attach clinical significance to this delta (ADR-0028 §4).
   */
  numericDelta: number | null;
  /**
   * Whether the value changed between baseline and current.
   * True when baseline ≠ current (structural equality, not semantic).
   */
  changed: boolean;
}

export interface CompareAssessmentResponsesOutputDTO {
  professionalProfileId: string;
  baselineResponseId: string;
  baselineLogicalDay: string;
  currentResponseId: string;
  currentLogicalDay: string;
  /** Fields present in both assessments, ordered by fieldId. */
  fieldComparisons: FieldComparisonDTO[];
  /**
   * fieldIds present in current but absent from baseline.
   * These fields were added to the template or left unanswered in the baseline.
   */
  newFieldIds: string[];
  /**
   * fieldIds present in baseline but absent from current.
   * These fields were removed from the template or left unanswered in the current.
   */
  removedFieldIds: string[];
}
