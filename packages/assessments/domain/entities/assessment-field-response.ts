import { BaseEntity, generateId } from '@fittrack/core';
import type { FieldValue } from '../value-objects/field-value.js';

export interface AssessmentFieldResponseProps {
  /**
   * ID of the AssessmentTemplateField this response answers.
   * Cross-entity reference within the AssessmentResponse aggregate boundary.
   * The full field definition (label, unit, options) is available via the
   * Deliverable snapshot (ADR-0011 §2, ADR-0005 §6 reference chain).
   */
  fieldId: string;

  /**
   * The recorded value for this field (Q7 — discriminated union).
   * The domain does not interpret the value's clinical significance (ADR-0028 §4).
   * Type consistency is validated at the application layer before creation.
   */
  value: FieldValue;
}

/**
 * AssessmentFieldResponse — subordinate entity of the AssessmentResponse
 * aggregate (ADR-0047 §4).
 *
 * ## Purpose
 *
 * Represents a single field's recorded value within an AssessmentResponse.
 * Each field from the template that was answered produces one
 * AssessmentFieldResponse.
 *
 * ## Immutability
 *
 * All field responses are immutable after AssessmentResponse creation, which
 * itself is immutable (mirrors ADR-0005 immutability philosophy for the
 * AssessmentResponse aggregate).
 *
 * ## Sensitive data (ADR-0037 §1, Category A)
 *
 * All response values are health data at the highest sensitivity level.
 * Sensitivity is enforced at the persistence and API layers, not in the domain.
 * The domain stores and retrieves values as structurally typed opaque data.
 *
 * ## Cross-aggregate reference
 *
 * `fieldId` references a field within the Deliverable's template snapshot
 * (accessed via the reference chain: AssessmentResponse → deliverableId →
 * Deliverable snapshot → field list). The domain does not hold a live reference
 * to AssessmentTemplateField objects (ADR-0047 §3 — cross-aggregate by ID only).
 */
export class AssessmentFieldResponse extends BaseEntity<AssessmentFieldResponseProps> {
  private constructor(id: string, props: AssessmentFieldResponseProps) {
    super(id, props);
  }

  static create(props: AssessmentFieldResponseProps, id?: string): AssessmentFieldResponse {
    return new AssessmentFieldResponse(id ?? generateId(), props);
  }

  static reconstitute(id: string, props: AssessmentFieldResponseProps): AssessmentFieldResponse {
    return new AssessmentFieldResponse(id, props);
  }

  get fieldId(): string {
    return this.props.fieldId;
  }

  get value(): FieldValue {
    return this.props.value;
  }
}
