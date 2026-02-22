import { AggregateRoot, UTCDateTime, LogicalDay, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { DeliverableType } from '../enums/deliverable-type.js';
import { DeliverableStatus } from '../enums/deliverable-status.js';
import { DeliverableTitle } from '../value-objects/deliverable-title.js';
import { ExerciseAssignment } from '../entities/exercise-assignment.js';
import type { ExerciseAssignmentProps } from '../entities/exercise-assignment.js';
import { InvalidDeliverableTransitionError } from '../errors/invalid-deliverable-transition-error.js';
import { DeliverableNotDraftError } from '../errors/deliverable-not-draft-error.js';
import { EmptyExerciseListError } from '../errors/empty-exercise-list-error.js';
import { ExerciseNotFoundError } from '../errors/exercise-not-found-error.js';

export interface DeliverableProps {
  /** Owning professional — tenant isolation key (ADR-0025). Immutable. */
  professionalProfileId: string;

  /** Human-readable name. 1–120 chars. Immutable after ACTIVE. */
  title: DeliverableTitle;

  /** Category of service this Deliverable represents (ADR-0044 §1). Immutable. */
  type: DeliverableType;

  /** Lifecycle state (ADR-0008 pattern). */
  status: DeliverableStatus;

  /**
   * Content version. Starts at 1.
   * Increments when exercises are added or removed while in DRAFT.
   * Locked (no further increment) once ACTIVE — content is snapshotted.
   */
  contentVersion: number;

  /** Optional free-text description of the Deliverable. */
  description: string | null;

  /**
   * Ordered exercise prescriptions for TRAINING_PRESCRIPTION type.
   *
   * Subordinate entities — owned exclusively by this aggregate (ADR-0047 §4).
   * Mutable only while status is DRAFT (ADR-0011 §3 — snapshot semantics).
   * Empty for DIET_PLAN and PHYSIOLOGICAL_ASSESSMENT types.
   */
  exercises: ExerciseAssignment[];

  /**
   * Calendar date of Deliverable creation in the professional's timezone (ADR-0010).
   * Computed once at creation, never recomputed.
   */
  logicalDay: LogicalDay;

  /**
   * IANA timezone used to compute logicalDay (ADR-0010).
   * Immutable — set at creation time.
   */
  timezoneUsed: string;

  /** UTC instant of creation (ADR-0010). Immutable. */
  createdAtUtc: UTCDateTime;

  /** UTC instant when the Deliverable was activated. Null until activation. */
  activatedAtUtc: UTCDateTime | null;

  /** UTC instant when the Deliverable was archived. Null until archival. */
  archivedAtUtc: UTCDateTime | null;
}

/**
 * Deliverable aggregate root — a professional's structured content that can
 * be delivered to clients under an AccessGrant (ADR-0044, ADR-0001 §2).
 *
 * ## Bounded context
 *
 * Belongs to the Execution bounded context (ADR-0001 §2). Sibling of
 * Scheduling and Billing; does not depend on them directly.
 *
 * ## Lifecycle (ADR-0008 pattern, ADR-0044 §2)
 *
 * ```
 * DRAFT → ACTIVE  (activate) — locks content; assignable via AccessGrant
 * DRAFT → ARCHIVED (archive) — terminal
 * ACTIVE → ARCHIVED (archive) — terminal
 * ```
 *
 * ## Snapshot semantics (ADR-0011)
 *
 * Content (ExerciseAssignments) may only be mutated while DRAFT.
 * On activation, the content is locked. The Deliverable itself IS the
 * immutable snapshot referenced by Execution records (ADR-0005 §8).
 * When the Catalog bounded context is available, catalog data is embedded
 * at draft time via catalogItemId + catalogVersion fields on each exercise.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * `professionalProfileId` is immutable and non-null. All repository queries
 * must include it as a scoping parameter.
 *
 * ## Cross-aggregate references (ADR-0047)
 *
 * Execution references this Deliverable by `deliverableId` (string ID only).
 * Deliverable never holds references to Execution, AccessGrant, or Transaction.
 *
 * ## Concurrency (ADR-0006)
 *
 * Carries optimistic locking `version` (from AggregateRoot base class).
 * Managed exclusively by the repository on every save.
 */
export class Deliverable extends AggregateRoot<DeliverableProps> {
  private constructor(id: string, props: DeliverableProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new Deliverable in DRAFT status.
   *
   * Title validation is performed here. logicalDay is computed from
   * `createdAtUtc` and `timezoneUsed` per ADR-0010.
   *
   * The created Deliverable has no exercises. Use `addExercise()` before
   * calling `activate()` for TRAINING_PRESCRIPTION type.
   */
  static create(props: {
    id?: string;
    professionalProfileId: string;
    title: DeliverableTitle;
    type: DeliverableType;
    description?: string | null;
    createdAtUtc: UTCDateTime;
    logicalDay: LogicalDay;
    timezoneUsed: string;
  }): DomainResult<Deliverable> {
    const id = props.id ?? generateId();
    const createdAtUtc = props.createdAtUtc;

    const deliverable = new Deliverable(id, {
      professionalProfileId: props.professionalProfileId,
      title: props.title,
      type: props.type,
      status: DeliverableStatus.DRAFT,
      contentVersion: 1,
      description: props.description ?? null,
      exercises: [],
      logicalDay: props.logicalDay,
      timezoneUsed: props.timezoneUsed,
      createdAtUtc,
      activatedAtUtc: null,
      archivedAtUtc: null,
    });

    return right(deliverable);
  }

  static reconstitute(id: string, props: DeliverableProps, version: number): Deliverable {
    return new Deliverable(id, props, version);
  }

  // ── Content mutation (DRAFT only) ────────────────────────────────────────

  /**
   * Appends an ExerciseAssignment to this Deliverable.
   *
   * Only permitted when status is DRAFT (ADR-0011 §3).
   * The new exercise is placed after all existing exercises.
   * `contentVersion` is incremented to track changes.
   */
  addExercise(
    props: Omit<ExerciseAssignmentProps, 'orderIndex'>,
    exerciseId?: string,
  ): DomainResult<ExerciseAssignment> {
    if (this.props.status !== DeliverableStatus.DRAFT) {
      return left(new DeliverableNotDraftError(this.id));
    }

    const orderIndex = this.props.exercises.length;
    const exercise = ExerciseAssignment.create({ ...props, orderIndex }, exerciseId);
    this.props.exercises.push(exercise);
    this.props.contentVersion += 1;

    return right(exercise);
  }

  /**
   * Removes an ExerciseAssignment by its local id.
   *
   * Only permitted when status is DRAFT (ADR-0011 §3).
   * Reindexes remaining exercises to maintain contiguous orderIndex values.
   * `contentVersion` is incremented to track changes.
   */
  removeExercise(exerciseAssignmentId: string): DomainResult<void> {
    if (this.props.status !== DeliverableStatus.DRAFT) {
      return left(new DeliverableNotDraftError(this.id));
    }

    const index = this.props.exercises.findIndex((e) => e.id === exerciseAssignmentId);
    if (index === -1) {
      return left(new ExerciseNotFoundError(exerciseAssignmentId));
    }

    this.props.exercises.splice(index, 1);

    // Reindex to maintain contiguous orderIndex values
    this.props.exercises.forEach((exercise, i) => {
      (exercise as unknown as { props: ExerciseAssignmentProps }).props.orderIndex = i;
    });

    this.props.contentVersion += 1;
    return right(undefined);
  }

  // ── State transitions (ADR-0008) ─────────────────────────────────────────

  /**
   * DRAFT → ACTIVE.
   *
   * Locks the content snapshot. After activation, exercises can no longer
   * be added or removed (ADR-0011 §3).
   *
   * Invariant for TRAINING_PRESCRIPTION type: at least one ExerciseAssignment must exist
   * before activation. An empty prescription is not a valid delivery (ADR-0044 §2).
   */
  activate(): DomainResult<void> {
    if (this.props.status !== DeliverableStatus.DRAFT) {
      return left(
        new InvalidDeliverableTransitionError(this.props.status, DeliverableStatus.ACTIVE),
      );
    }

    if (
      this.props.type === DeliverableType.TRAINING_PRESCRIPTION &&
      this.props.exercises.length === 0
    ) {
      return left(new EmptyExerciseListError(this.id));
    }

    this.props.status = DeliverableStatus.ACTIVE;
    this.props.activatedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /**
   * DRAFT | ACTIVE → ARCHIVED (terminal).
   *
   * Permanently retires the Deliverable. No transitions out of ARCHIVED.
   * Existing Execution records that reference this Deliverable are unaffected
   * (ADR-0005 — Execution immutability).
   */
  archive(): DomainResult<void> {
    const allowed: DeliverableStatus[] = [DeliverableStatus.DRAFT, DeliverableStatus.ACTIVE];

    if (!allowed.includes(this.props.status)) {
      return left(
        new InvalidDeliverableTransitionError(this.props.status, DeliverableStatus.ARCHIVED),
      );
    }

    this.props.status = DeliverableStatus.ARCHIVED;
    this.props.archivedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  // ── Query methods ────────────────────────────────────────────────────────

  /** True when the Deliverable can be assigned to clients via AccessGrant. */
  isActive(): boolean {
    return this.props.status === DeliverableStatus.ACTIVE;
  }

  /** True when content can still be mutated. */
  isDraft(): boolean {
    return this.props.status === DeliverableStatus.DRAFT;
  }

  /** True when the Deliverable has been permanently retired. */
  isArchived(): boolean {
    return this.props.status === DeliverableStatus.ARCHIVED;
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get title(): DeliverableTitle {
    return this.props.title;
  }

  get type(): DeliverableType {
    return this.props.type;
  }

  get status(): DeliverableStatus {
    return this.props.status;
  }

  get contentVersion(): number {
    return this.props.contentVersion;
  }

  get description(): string | null {
    return this.props.description;
  }

  /** Returns a shallow copy — callers must not mutate the returned array. */
  get exercises(): ReadonlyArray<ExerciseAssignment> {
    return [...this.props.exercises];
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
