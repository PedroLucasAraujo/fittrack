import type { TemplateFieldType } from '../../domain/enums/template-field-type.js';

/**
 * Shape of a single field as embedded in the Deliverable's template snapshot.
 * Corresponds to the snapshot structure defined in ADR-0011 §2 for
 * Evaluation Templates.
 */
export interface DeliverableTemplateFieldView {
  /** Local ID of this field within the template snapshot. */
  id: string;
  /** Human-readable field name at snapshot time. */
  label: string;
  /** Value type constraint (NUMBER, TEXT, BOOLEAN, SELECT). */
  fieldType: TemplateFieldType;
  /** Unit of measurement for NUMBER fields. Null otherwise. */
  unit: string | null;
  /** Whether a response is required for this field. */
  required: boolean;
  /** Valid selection options for SELECT fields. Null otherwise. */
  options: string[] | null;
}

/**
 * Shape of a Deliverable as seen by the Assessments application layer.
 *
 * Only the fields relevant to RecordAssessmentResponse validation are included.
 * The Assessments context does not need the full Deliverable aggregate.
 */
export interface DeliverableView {
  /** Unique identifier of the Deliverable. */
  id: string;
  /**
   * Deliverable type discriminator (ADR-0044 §1).
   * Must be 'PHYSIOLOGICAL_ASSESSMENT' for AssessmentResponse creation.
   */
  type: string;
  /** Owning professional (tenant isolation, ADR-0025). */
  professionalProfileId: string;
  /**
   * Template field definitions embedded in this Deliverable's snapshot
   * (ADR-0011 §2 — evaluation template snapshot fields).
   * Used to validate field responses before AssessmentResponse creation.
   */
  templateFields: DeliverableTemplateFieldView[];
}

/**
 * Port through which the Assessments application layer queries Deliverable data.
 *
 * Implemented by an infrastructure adapter that queries the Deliverables
 * bounded context. Never a direct repository import (ADR-0001 §3).
 */
export interface IDeliverablePort {
  /**
   * Returns the DeliverableView for the given deliverable ID.
   * Returns null when not found or when the deliverable belongs to a
   * different tenant.
   */
  findById(deliverableId: string, professionalProfileId: string): Promise<DeliverableView | null>;
}
