import { AggregateRoot, UTCDateTime, LogicalDay, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AssessmentTemplateStatus } from '../enums/assessment-template-status.js';
import type { AssessmentTemplateStatus as AssessmentTemplateStatusType } from '../enums/assessment-template-status.js';
import { AssessmentTemplateTitle } from '../value-objects/assessment-template-title.js';
import { AssessmentTemplateField } from '../entities/assessment-template-field.js';
import type { AssessmentTemplateFieldProps } from '../entities/assessment-template-field.js';
import { InvalidAssessmentTemplateTransitionError } from '../errors/invalid-assessment-template-transition-error.js';
import { AssessmentTemplateNotDraftError } from '../errors/assessment-template-not-draft-error.js';
import { EmptyTemplateFieldsError } from '../errors/empty-template-fields-error.js';
import { TemplateFieldNotFoundError } from '../errors/template-field-not-found-error.js';

export interface AssessmentTemplateProps {
  /**
   * Owning professional — tenant isolation key (ADR-0025). Immutable.
   * Cross-aggregate reference: ID only (ADR-0047).
   */
  professionalProfileId: string;

  /** Human-readable name. 1–120 chars. Immutable after ACTIVE. */
  title: AssessmentTemplateTitle;

  /** Optional free-text description of the template's purpose. */
  description: string | null;

  /** Lifecycle state (ADR-0008 pattern). */
  status: AssessmentTemplateStatusType;

  /**
   * Ordered field definitions that make up this assessment template.
   *
   * Subordinate entities — owned exclusively by this aggregate (ADR-0047 §4).
   * Mutable only while status is DRAFT (ADR-0011 §3 snapshot semantics).
   * Locked on ACTIVE transition — fields form the immutable prescription snapshot.
   */
  fields: AssessmentTemplateField[];

  /**
   * Content version. Starts at 1.
   * Increments when fields are added or removed while in DRAFT.
   * Locked once ACTIVE — content is snapshotted at that version.
   */
  contentVersion: number;

  /**
   * Calendar date of template creation in the professional's timezone (ADR-0010).
   * Computed once at creation, never recomputed.
   */
  logicalDay: LogicalDay;

  /**
   * IANA timezone used to compute logicalDay (ADR-0010). Immutable.
   */
  timezoneUsed: string;

  /** UTC instant of creation. Immutable. */
  createdAtUtc: UTCDateTime;

  /** UTC instant when the template was activated. Null until activation. */
  activatedAtUtc: UTCDateTime | null;

  /** UTC instant when the template was archived. Null until archival. */
  archivedAtUtc: UTCDateTime | null;
}

/**
 * AssessmentTemplate aggregate root — a professional's reusable evaluation
 * form definition that can be prescribed to clients as a Deliverable of type
 * PHYSIOLOGICAL_ASSESSMENT (ADR-0044 §1, ADR-0001 §2).
 *
 * ## Bounded context
 *
 * Belongs to the Assessments bounded context (`@fittrack/assessments`).
 * Does not depend on Billing, Scheduling, Execution, or Deliverables directly.
 * The Deliverables bounded context embeds an immutable snapshot of this
 * template's fields at prescription time (ADR-0011 §2).
 *
 * ## Lifecycle (ADR-0008 pattern)
 *
 * ```
 * DRAFT → ACTIVE   (activateTemplate) — locks fields; template is prescription-ready
 * DRAFT → ARCHIVED (archiveTemplate)  — terminal
 * ACTIVE → ARCHIVED (archiveTemplate) — terminal
 * ```
 *
 * ## Snapshot semantics (ADR-0011)
 *
 * Fields may only be mutated while DRAFT. On activation, the field list is
 * locked. When a professional prescribes an assessment, the Deliverables context
 * reads this template and embeds an immutable snapshot of the fields. Subsequent
 * changes to this template (or archival) do not affect existing Deliverables.
 *
 * ## Invariants
 *
 * 1. At least one field must exist before activation (EmptyTemplateFieldsError).
 * 2. Fields are only added/removed in DRAFT status (AssessmentTemplateNotDraftError).
 * 3. SELECT fields must provide at least 2 options at the application layer.
 *    (Domain trusts pre-validated input from use cases.)
 *
 * ## Tenant isolation (ADR-0025)
 *
 * `professionalProfileId` is immutable and non-null. All repository queries
 * must include it as a scoping parameter.
 *
 * ## Concurrency (ADR-0006)
 *
 * Carries optimistic locking `version` via AggregateRoot base class.
 *
 * ## Domain events
 *
 * No domain events emitted in MVP — no registered cross-context consumers
 * for AssessmentTemplate state changes (ADR-0009 §5, Q8 decision).
 */
export class AssessmentTemplate extends AggregateRoot<AssessmentTemplateProps> {
  private constructor(id: string, props: AssessmentTemplateProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new AssessmentTemplate in DRAFT status.
   *
   * Title validation is performed here. logicalDay is computed from
   * `createdAtUtc` and `timezoneUsed` per ADR-0010.
   *
   * The created template has no fields. Use `addField()` before calling
   * `activateTemplate()`.
   */
  static create(props: {
    id?: string;
    professionalProfileId: string;
    title: AssessmentTemplateTitle;
    description?: string | null;
    createdAtUtc: UTCDateTime;
    logicalDay: LogicalDay;
    timezoneUsed: string;
  }): DomainResult<AssessmentTemplate> {
    const id = props.id ?? generateId();

    const template = new AssessmentTemplate(id, {
      professionalProfileId: props.professionalProfileId,
      title: props.title,
      description: props.description ?? null,
      status: AssessmentTemplateStatus.DRAFT,
      fields: [],
      contentVersion: 1,
      logicalDay: props.logicalDay,
      timezoneUsed: props.timezoneUsed,
      createdAtUtc: props.createdAtUtc,
      activatedAtUtc: null,
      archivedAtUtc: null,
    });

    return right(template);
  }

  static reconstitute(
    id: string,
    props: AssessmentTemplateProps,
    version: number,
  ): AssessmentTemplate {
    return new AssessmentTemplate(id, props, version);
  }

  // ── Field mutations (DRAFT only) ─────────────────────────────────────────

  /**
   * Appends an AssessmentTemplateField to this template.
   *
   * Only permitted when status is DRAFT (ADR-0011 §3).
   * The new field is placed after all existing fields.
   * `contentVersion` is incremented to track changes.
   *
   * The domain trusts that SELECT fields have been pre-validated with ≥ 2
   * options by the calling use case.
   */
  addField(
    props: Omit<AssessmentTemplateFieldProps, 'orderIndex'>,
    fieldId?: string,
  ): DomainResult<AssessmentTemplateField> {
    if (this.props.status !== AssessmentTemplateStatus.DRAFT) {
      return left(new AssessmentTemplateNotDraftError(this.id));
    }

    const orderIndex = this.props.fields.length;
    const field = AssessmentTemplateField.create({ ...props, orderIndex }, fieldId);
    this.props.fields.push(field);
    this.props.contentVersion += 1;

    return right(field);
  }

  /**
   * Removes an AssessmentTemplateField by its local id.
   *
   * Only permitted when status is DRAFT (ADR-0011 §3).
   * Reindexes remaining fields to maintain contiguous orderIndex values.
   * `contentVersion` is incremented to track changes.
   */
  removeField(fieldId: string): DomainResult<void> {
    if (this.props.status !== AssessmentTemplateStatus.DRAFT) {
      return left(new AssessmentTemplateNotDraftError(this.id));
    }

    const index = this.props.fields.findIndex((f) => f.id === fieldId);
    if (index === -1) {
      return left(new TemplateFieldNotFoundError(fieldId));
    }

    this.props.fields.splice(index, 1);

    // Reindex to maintain contiguous orderIndex values
    this.props.fields.forEach((field, i) => {
      (field as unknown as { props: AssessmentTemplateFieldProps }).props.orderIndex = i;
    });

    this.props.contentVersion += 1;
    return right(undefined);
  }

  // ── State transitions (ADR-0008) ──────────────────────────────────────────

  /**
   * DRAFT → ACTIVE.
   *
   * Locks the field list. After activation, fields can no longer be added
   * or removed (ADR-0011 §3 snapshot semantics).
   *
   * Invariant: at least one field must exist before activation.
   * An empty template produces no assessable content (ADR-0044 §2 analogue).
   */
  activateTemplate(): DomainResult<UTCDateTime> {
    if (this.props.status !== AssessmentTemplateStatus.DRAFT) {
      return left(
        new InvalidAssessmentTemplateTransitionError(
          this.props.status,
          AssessmentTemplateStatus.ACTIVE,
        ),
      );
    }

    if (this.props.fields.length === 0) {
      return left(new EmptyTemplateFieldsError(this.id));
    }

    const now = UTCDateTime.now();
    this.props.status = AssessmentTemplateStatus.ACTIVE;
    this.props.activatedAtUtc = now;
    return right(now);
  }

  /**
   * DRAFT | ACTIVE → ARCHIVED (terminal).
   *
   * Permanently retires the template. No transitions out of ARCHIVED.
   * Existing Deliverables that embed a snapshot of this template are
   * unaffected (ADR-0011 §3 — snapshot immutability).
   */
  archiveTemplate(): DomainResult<UTCDateTime> {
    const allowed: AssessmentTemplateStatusType[] = [
      AssessmentTemplateStatus.DRAFT,
      AssessmentTemplateStatus.ACTIVE,
    ];

    if (!allowed.includes(this.props.status)) {
      return left(
        new InvalidAssessmentTemplateTransitionError(
          this.props.status,
          AssessmentTemplateStatus.ARCHIVED,
        ),
      );
    }

    const now = UTCDateTime.now();
    this.props.status = AssessmentTemplateStatus.ARCHIVED;
    this.props.archivedAtUtc = now;
    return right(now);
  }

  // ── Query methods ─────────────────────────────────────────────────────────

  /** True when fields can still be mutated. */
  isDraft(): boolean {
    return this.props.status === AssessmentTemplateStatus.DRAFT;
  }

  /** True when the template can be referenced for Deliverable prescription. */
  isActive(): boolean {
    return this.props.status === AssessmentTemplateStatus.ACTIVE;
  }

  /** True when the template has been permanently retired. */
  isArchived(): boolean {
    return this.props.status === AssessmentTemplateStatus.ARCHIVED;
  }

  /**
   * Looks up a field by its ID within this template.
   * Returns undefined if no field with that ID exists.
   */
  findField(fieldId: string): AssessmentTemplateField | undefined {
    return this.props.fields.find((f) => f.id === fieldId);
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get title(): AssessmentTemplateTitle {
    return this.props.title;
  }

  get description(): string | null {
    return this.props.description;
  }

  get status(): AssessmentTemplateStatusType {
    return this.props.status;
  }

  /** Returns a shallow copy — callers must not mutate the returned array. */
  get fields(): ReadonlyArray<AssessmentTemplateField> {
    return [...this.props.fields];
  }

  get contentVersion(): number {
    return this.props.contentVersion;
  }

  get logicalDay(): LogicalDay {
    return this.props.logicalDay;
  }

  get timezoneUsed(): string {
    return this.props.timezoneUsed;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get activatedAtUtc(): UTCDateTime | null {
    return this.props.activatedAtUtc;
  }

  get archivedAtUtc(): UTCDateTime | null {
    return this.props.archivedAtUtc;
  }
}
