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

  // ── Snapshot content (ADR-0011 §2) ─────────────────────────────────
  /** Exercise name at snapshot time. */
  name: string;

  /**
   * Exercise category at snapshot time (ADR-0011 §2).
   * Examples: 'STRENGTH', 'CARDIO', 'MOBILITY'.
   * Null when the catalog item did not specify a category or when
   * catalogItemId is null.
   */
  category: string | null;

  /**
   * Muscle groups targeted at snapshot time (ADR-0011 §2).
   * Examples: ['CHEST', 'TRICEPS'].
   * Null when the catalog item did not specify muscle groups or when
   * catalogItemId is null.
   */
  muscleGroups: string[] | null;

  /**
   * Step-by-step execution instructions at snapshot time (ADR-0011 §2).
   * Null when no instructions were defined or when catalogItemId is null.
   */
  instructions: string | null;

  /**
   * URL of a demonstration video or image at snapshot time (ADR-0011 §2).
   * Null when no media was associated or when catalogItemId is null.
   */
  mediaUrl: string | null;

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
 * Input type for `ExerciseAssignment.create()`.
 *
 * The four ADR-0011 §2 catalog snapshot fields (`category`, `muscleGroups`,
 * `instructions`, `mediaUrl`) and `orderIndex` are optional and default to
 * `null` / `0` respectively, preserving backward compatibility with call
 * sites that predate the Catalog module.
 */
export type ExerciseAssignmentCreateInput = Omit<
  ExerciseAssignmentProps,
  'orderIndex' | 'category' | 'muscleGroups' | 'instructions' | 'mediaUrl'
> & {
  orderIndex?: number;
  category?: string | null;
  muscleGroups?: string[] | null;
  instructions?: string | null;
  mediaUrl?: string | null;
};

/**
 * ExerciseAssignment — subordinate entity of the Deliverable aggregate (ADR-0047 §4).
 *
 * Represents one exercise prescription within a TRAINING_PRESCRIPTION Deliverable.
 * Contains an immutable snapshot of the exercise content at the time
 * the professional defined it (ADR-0011 §2).
 *
 * ## Snapshot completeness (ADR-0011 §2)
 *
 * The snapshot must contain sufficient data for complete historical
 * reconstruction. All fields required by ADR-0011 §2 for Exercise resources
 * are present: `name`, `category`, `muscleGroups`, `instructions`, `mediaUrl`,
 * `catalogItemId`, `catalogVersion`, `snapshotCreatedAtUtc`.
 *
 * Fields introduced after the Catalog bounded context became available
 * (`category`, `muscleGroups`, `instructions`, `mediaUrl`) are nullable for
 * backward compatibility with prescriptions created before the Catalog module.
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

  /**
   * Creates an ExerciseAssignment for use when building a Deliverable.
   *
   * The ADR-0011 §2 catalog fields (`category`, `muscleGroups`, `instructions`,
   * `mediaUrl`) are optional in this factory and default to `null`, preserving
   * backward compatibility with call sites that predate the Catalog module.
   * When a CatalogItem has been resolved, these fields should be populated
   * from the catalog snapshot to satisfy ADR-0011 §2.
   */
  static create(props: ExerciseAssignmentCreateInput, id?: string): ExerciseAssignment {
    return new ExerciseAssignment(id ?? generateId(), {
      ...props,
      category: props.category ?? null,
      muscleGroups: props.muscleGroups ?? null,
      instructions: props.instructions ?? null,
      mediaUrl: props.mediaUrl ?? null,
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

  get category(): string | null {
    return this.props.category;
  }

  /** Returns a copy — callers must not mutate the returned array. */
  get muscleGroups(): string[] | null {
    return this.props.muscleGroups ? [...this.props.muscleGroups] : null;
  }

  get instructions(): string | null {
    return this.props.instructions;
  }

  get mediaUrl(): string | null {
    return this.props.mediaUrl;
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
