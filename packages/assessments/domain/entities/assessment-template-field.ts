import { BaseEntity, generateId } from '@fittrack/core';
import type { TemplateFieldType } from '../enums/template-field-type.js';
import type { TemplateFieldLabel } from '../value-objects/template-field-label.js';

export interface AssessmentTemplateFieldProps {
  /**
   * Human-readable name of this field shown to professionals and clients.
   * Part of the immutable snapshot embedded in Deliverables (ADR-0011 §2).
   */
  label: TemplateFieldLabel;

  /**
   * Value type constraint for responses to this field (Q7 — discriminated union).
   * Immutable after creation — changing field type is a breaking change; create
   * a new template version instead.
   */
  fieldType: TemplateFieldType;

  /**
   * Unit of measurement for NUMBER fields (e.g., "kg", "cm", "%").
   * Null for TEXT, BOOLEAN, and SELECT fields.
   * Included in the Deliverable snapshot (ADR-0011 §2) for historical display.
   */
  unit: string | null;

  /**
   * Whether a response to this field is required when recording an assessment.
   * Validated at the application layer (use case), not inside AssessmentResponse
   * domain aggregate (which does not load the template's field definitions).
   */
  required: boolean;

  /**
   * Valid options for SELECT fields. Must have at least 2 elements when
   * fieldType is SELECT; null for all other field types.
   * Part of the snapshot (ADR-0011 §2).
   */
  options: string[] | null;

  /**
   * Display position of this field within the template (zero-based).
   * Re-indexed when a field is removed, maintaining contiguous values.
   */
  orderIndex: number;
}

/**
 * AssessmentTemplateField — subordinate entity of the AssessmentTemplate
 * aggregate (ADR-0047 §4).
 *
 * ## Ownership
 *
 * Owned exclusively by AssessmentTemplate. Not accessible by ID from outside
 * the aggregate boundary. Created and removed only via AssessmentTemplate
 * domain methods (`addField`, `removeField`).
 *
 * ## Immutability
 *
 * Fields are mutable only while the parent AssessmentTemplate is in DRAFT
 * status (ADR-0011 §3 — snapshot semantics). On template activation, the
 * complete field list is locked and forms the immutable prescription record
 * embedded in Deliverables.
 *
 * ## Snapshot (ADR-0011 §2)
 *
 * When an AssessmentTemplate is referenced at Deliverable prescription time,
 * the complete field list (label, fieldType, unit, required, options) is
 * embedded as an immutable snapshot in the Deliverable. This snapshot enables
 * complete historical reconstruction without reference to the live template.
 */
export class AssessmentTemplateField extends BaseEntity<AssessmentTemplateFieldProps> {
  private constructor(id: string, props: AssessmentTemplateFieldProps) {
    super(id, props);
  }

  static create(props: AssessmentTemplateFieldProps, id?: string): AssessmentTemplateField {
    return new AssessmentTemplateField(id ?? generateId(), props);
  }

  static reconstitute(id: string, props: AssessmentTemplateFieldProps): AssessmentTemplateField {
    return new AssessmentTemplateField(id, props);
  }

  get label(): TemplateFieldLabel {
    return this.props.label;
  }

  get fieldType(): TemplateFieldType {
    return this.props.fieldType;
  }

  get unit(): string | null {
    return this.props.unit;
  }

  get required(): boolean {
    return this.props.required;
  }

  /** Returns a copy — callers must not mutate the returned array. */
  get options(): string[] | null {
    return this.props.options ? [...this.props.options] : null;
  }

  get orderIndex(): number {
    return this.props.orderIndex;
  }
}
