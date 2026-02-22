import type { DeliverableType } from '../../domain/enums/deliverable-type.js';

export interface ExerciseAssignmentInputDTO {
  /** Optional catalog reference. Null until Catalog context is available. */
  catalogItemId?: string | null;
  catalogVersion?: number | null;
  /** Name of the exercise (required when catalogItemId is null). */
  name: string;
  sets?: number | null;
  reps?: number | null;
  durationSeconds?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
}

export interface CreateDeliverableInputDTO {
  /** From JWT — never from request body (ADR-0025). */
  professionalProfileId: string;
  title: string;
  type: DeliverableType;
  description?: string | null;
  /**
   * ISO 8601 UTC string (must end with 'Z') representing the creation instant.
   * Used together with `timezoneUsed` to compute `logicalDay` (ADR-0010).
   */
  createdAtUtc: string;
  /** IANA timezone of the professional at creation time (ADR-0010). */
  timezoneUsed: string;
  /**
   * Initial exercises (PROGRAM type only).
   * Ignored for DIET_PLAN and ASSESSMENT_TEMPLATE.
   */
  exercises?: ExerciseAssignmentInputDTO[];
}
