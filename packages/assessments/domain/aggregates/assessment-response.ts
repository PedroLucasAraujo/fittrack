import { AggregateRoot, UTCDateTime, LogicalDay, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AssessmentFieldResponse } from '../entities/assessment-field-response.js';
import { InvalidAssessmentResponseError } from '../errors/invalid-assessment-response-error.js';
import { DuplicateFieldResponseError } from '../errors/duplicate-field-response-error.js';
import type { FieldValue } from '../value-objects/field-value.js';

export interface FieldResponseInput {
  /** ID of the AssessmentTemplateField being answered. */
  fieldId: string;
  /** Typed value recorded for this field (discriminated union). */
  value: FieldValue;
}

export interface AssessmentResponseProps {
  /**
   * ID of the Execution record that confirms this assessment was performed
   * (ADR-0005 §8 — Execution is the authoritative delivery record).
   * Cross-aggregate reference: ID only (ADR-0047). Immutable.
   */
  executionId: string;

  /**
   * ID of the PHYSIOLOGICAL_ASSESSMENT Deliverable whose snapshot defines
   * the fields that were assessed (ADR-0011 §6 reference chain).
   * Cross-aggregate reference: ID only (ADR-0047). Immutable.
   *
   * The field definitions (label, type, unit, options) are available via:
   * AssessmentResponse.deliverableId → Deliverable (snapshot).
   */
  deliverableId: string;

  /**
   * Owning professional — tenant isolation key (ADR-0025). Immutable.
   * Denormalized from the Execution record for query efficiency.
   */
  professionalProfileId: string;

  /**
   * Client who underwent the assessment.
   * Cross-aggregate reference: ID only (ADR-0047). Immutable.
   * Denormalized from the Execution record.
   */
  clientId: string;

  /**
   * Calendar date of the assessment in the client's timezone (ADR-0010).
   * Denormalized from the Execution record (Execution.logicalDay). Immutable.
   */
  logicalDay: LogicalDay;

  /**
   * Client's IANA timezone used to compute logicalDay (ADR-0010). Immutable.
   * Denormalized from the Execution record.
   */
  timezoneUsed: string;

  /**
   * Recorded field values for this assessment.
   *
   * Subordinate entities — owned exclusively by this aggregate (ADR-0047 §4).
   * Immutable after AssessmentResponse creation.
   * The domain enforces no duplicate fieldIds and at least one response.
   *
   * All values are health data (ADR-0037 §1, Category A — Highest sensitivity).
   * Sensitivity enforcement is at the persistence and API layers.
   */
  responses: AssessmentFieldResponse[];

  /** UTC instant when this response record was created. Immutable. */
  createdAtUtc: UTCDateTime;
}

/**
 * AssessmentResponse aggregate root — an immutable record of field values
 * captured during a PHYSIOLOGICAL_ASSESSMENT execution.
 *
 * ## Bounded context
 *
 * Belongs to the Assessments bounded context (`@fittrack/assessments`).
 * Produced by the `RecordAssessmentResponse` use case after a CONFIRMED
 * Execution of a PHYSIOLOGICAL_ASSESSMENT Deliverable.
 *
 * ## Immutability
 *
 * AssessmentResponse is permanently immutable after creation, mirroring the
 * immutability philosophy of Execution (ADR-0005). Once recorded, the captured
 * field values cannot be modified or deleted. Corrections are handled at the
 * business process level (create a new corrective assessment execution).
 *
 * ## Relationship to Execution (ADR-0005, Conflict A Resolution)
 *
 * Execution records the FACT of assessment delivery (who, when, under which
 * AccessGrant). AssessmentResponse records the DATA captured during that
 * delivery (field values). They are separate aggregates in separate transactions,
 * consistent with the eventual consistency model (ADR-0016).
 *
 * AssessmentResponse references Execution and Deliverable by ID only
 * (ADR-0047 §3). It never holds live object references.
 *
 * ## Snapshot reference chain (ADR-0011 §6, Q4 — Option A)
 *
 * AssessmentResponse → executionId → Execution → deliverableId → Deliverable
 * The Deliverable contains the immutable snapshot of the template's fields.
 * AssessmentResponse stores only the responses, not a duplicate of the snapshot.
 *
 * ## Sensitive data (ADR-0037 §1, Category A)
 *
 * All field response values are health data at the highest sensitivity level.
 * They must never appear in logs, error messages, audit entries, or cache
 * (ADR-0037 §4). The domain does not classify individual values; enforcement
 * is at the persistence and API layers.
 *
 * ## Domain invariants
 *
 * 1. At least one field response must be present.
 * 2. No two responses may answer the same fieldId.
 * 3. All prerequisite cross-context checks (Execution CONFIRMED, Deliverable
 *    type = PHYSIOLOGICAL_ASSESSMENT) are enforced by the Application layer
 *    before calling this factory. The domain trusts pre-validated input.
 *
 * ## Concurrency (ADR-0006)
 *
 * Carries optimistic locking `version` via AggregateRoot base class.
 *
 * ## Domain events
 *
 * No AssessmentResponseRecorded event emitted in MVP — no cross-context
 * consumers identified. ExecutionRecorded (from the Execution bounded context)
 * is sufficient for audit, Metrics, and integration (ADR-0009 §5, Q8 decision).
 */
export class AssessmentResponse extends AggregateRoot<AssessmentResponseProps> {
  private constructor(id: string, props: AssessmentResponseProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new AssessmentResponse.
   *
   * ## Prerequisites (enforced by Application layer before calling this factory)
   *
   * - The referenced Execution must be CONFIRMED (ADR-0005 §9).
   * - The referenced Deliverable must be of type PHYSIOLOGICAL_ASSESSMENT (ADR-0044 §1).
   * - Each response fieldId must exist in the Deliverable's template snapshot.
   * - Each response value type must match the corresponding template field's fieldType.
   * - All required fields (per the template snapshot) must have a response.
   *
   * ## Domain invariants (enforced here)
   *
   * - At least one response must be provided.
   * - No duplicate fieldIds in the responses list.
   *
   * @param responses Pre-validated field responses. The factory trusts that
   *   value types have been matched against the template field definitions by
   *   the calling use case.
   */
  static create(props: {
    id?: string;
    executionId: string;
    deliverableId: string;
    professionalProfileId: string;
    clientId: string;
    logicalDay: LogicalDay;
    timezoneUsed: string;
    responses: FieldResponseInput[];
    createdAtUtc: UTCDateTime;
  }): DomainResult<AssessmentResponse> {
    // Invariant 1: at least one response
    if (props.responses.length === 0) {
      return left(new InvalidAssessmentResponseError('at least one field response is required'));
    }

    // Invariant 2: no duplicate fieldIds
    const seen = new Set<string>();
    for (const r of props.responses) {
      if (seen.has(r.fieldId)) {
        return left(new DuplicateFieldResponseError(r.fieldId));
      }
      seen.add(r.fieldId);
    }

    const id = props.id ?? generateId();
    const fieldResponses = props.responses.map((r) =>
      AssessmentFieldResponse.create({ fieldId: r.fieldId, value: r.value }),
    );

    const response = new AssessmentResponse(
      id,
      {
        executionId: props.executionId,
        deliverableId: props.deliverableId,
        professionalProfileId: props.professionalProfileId,
        clientId: props.clientId,
        logicalDay: props.logicalDay,
        timezoneUsed: props.timezoneUsed,
        responses: fieldResponses,
        createdAtUtc: props.createdAtUtc,
      },
      0,
    );

    return right(response);
  }

  static reconstitute(
    id: string,
    props: AssessmentResponseProps,
    version: number,
  ): AssessmentResponse {
    return new AssessmentResponse(id, props, version);
  }

  // ── Query helpers ─────────────────────────────────────────────────────────

  /**
   * Finds the recorded response for a given fieldId.
   * Returns undefined if this response did not record a value for that field
   * (i.e., the field was optional and was left unanswered).
   */
  findResponseForField(fieldId: string): AssessmentFieldResponse | undefined {
    return this.props.responses.find((r) => r.fieldId === fieldId);
  }

  /** Total number of fields answered in this assessment. */
  get responseCount(): number {
    return this.props.responses.length;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get executionId(): string {
    return this.props.executionId;
  }

  get deliverableId(): string {
    return this.props.deliverableId;
  }

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get logicalDay(): LogicalDay {
    return this.props.logicalDay;
  }

  get timezoneUsed(): string {
    return this.props.timezoneUsed;
  }

  /** Returns a shallow copy — callers must not mutate the returned array. */
  get responses(): ReadonlyArray<AssessmentFieldResponse> {
    return [...this.props.responses];
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }
}
