import { BaseEntity, generateId } from '@fittrack/core';

export interface ExerciseAssignmentProps {
  /**
   * Reference to the Catalog bounded context (ADR-0011 §4).
   * Null when Catalog context is not yet available (MVP).
   * Populated when the Catalog provides the source exercise definition.
   */
  catalogItemId: string | null;

  /**
   * Version of the catalog item at snapshot time (ADR-0011 §4).
   * Null when catalogItemId is null.
   */
  catalogVersion: number | null;

  /**
   * UTC instant at which the catalog snapshot was captured (ADR-0011 §2).
   * Null when catalogItemId is null.
   */
  snapshotCreatedAtUtc: string | null;

  // ── Snapshot content (always present) ──────────────────────────────
  /** Exercise name at snapshot time. */
  name: string;

  /** Number of sets prescribed. Null if not applicable (e.g., time-based). */
  sets: number | null;

  /** Number of repetitions per set. Null if not applicable. */
  reps: number | null;

  /** Duration of the exercise in seconds. Null if not applicable (e.g., rep-based). */
  durationSeconds: number | null;

  /** Rest period between sets in seconds. Null if not prescribed. */
  restSeconds: number | null;

  /** Optional coaching notes for this exercise. */
  notes: string | null;

  /** Position of this exercise within the Deliverable (zero-based). */
  orderIndex: number;
}

/**
 * ExerciseAssignment — subordinate entity of the Deliverable aggregate (ADR-0047 §4).
 *
 * Represents one exercise prescription within a PROGRAM Deliverable.
 * Contains an immutable snapshot of the exercise content at the time
 * the professional defined it (ADR-0011 §2).
 *
 * ## Ownership rules
 *
 * - Owned exclusively by the Deliverable aggregate.
 * - Not accessible by ID from outside the Deliverable boundary.
 * - Mutations performed only through Deliverable domain methods.
 * - Content is locked when the Deliverable transitions to ACTIVE (ADR-0011 §3).
 *
 * ## Cross-context traceability (ADR-0011 §4)
 *
 * `catalogItemId` and `catalogVersion` enable auditors to identify which
 * Catalog version was active at prescription time, without depending on
 * the live Catalog state.
 */
export class ExerciseAssignment extends BaseEntity<ExerciseAssignmentProps> {
  private constructor(id: string, props: ExerciseAssignmentProps) {
    super(id, props);
  }

  static create(
    props: Omit<ExerciseAssignmentProps, 'orderIndex'> & { orderIndex?: number },
    id?: string,
  ): ExerciseAssignment {
    return new ExerciseAssignment(id ?? generateId(), {
      ...props,
      orderIndex: props.orderIndex ?? 0,
    });
  }

  static reconstitute(id: string, props: ExerciseAssignmentProps): ExerciseAssignment {
    return new ExerciseAssignment(id, props);
  }

  get catalogItemId(): string | null {
    return this.props.catalogItemId;
  }

  get catalogVersion(): number | null {
    return this.props.catalogVersion;
  }

  get snapshotCreatedAtUtc(): string | null {
    return this.props.snapshotCreatedAtUtc;
  }

  get name(): string {
    return this.props.name;
  }

  get sets(): number | null {
    return this.props.sets;
  }

  get reps(): number | null {
    return this.props.reps;
  }

  get durationSeconds(): number | null {
    return this.props.durationSeconds;
  }

  get restSeconds(): number | null {
    return this.props.restSeconds;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get orderIndex(): number {
    return this.props.orderIndex;
  }
}
