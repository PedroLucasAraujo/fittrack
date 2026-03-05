import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { DeliverableType } from '../../enums/deliverable-type.js';
import { InvalidTemplateStructureError } from '../../errors/invalid-template-structure-error.js';
import type { ITemplateStructure, TemplateSnapshot } from './i-template-structure.js';

export interface WorkoutExerciseRef {
  /** Optional reference to Catalog exercise (ADR-0047 — ID only). */
  catalogItemId: string | null;
  name: string;
  sets: number | null;
  reps: number | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  notes: string | null;
}

export interface WorkoutSession {
  name: string;
  exercises: WorkoutExerciseRef[];
}

/**
 * Template structure for TRAINING_PRESCRIPTION deliverables.
 *
 * Contains one or more workout sessions, each with an ordered list of exercises.
 * Catalog references are by ID only (ADR-0047).
 *
 * Validation rules:
 *   - At least one session required.
 *   - Each session must have at least one exercise.
 *   - Each exercise must have a name.
 */
export class WorkoutTemplateStructure implements ITemplateStructure {
  readonly type = DeliverableType.TRAINING_PRESCRIPTION;

  private constructor(private readonly sessions: WorkoutSession[]) {}

  static create(sessions: WorkoutSession[]): WorkoutTemplateStructure {
    return new WorkoutTemplateStructure(
      sessions.map((s) => ({ ...s, exercises: [...s.exercises] })),
    );
  }

  /** Returns a copy of the sessions array. */
  getSessions(): WorkoutSession[] {
    return this.sessions.map((s) => ({ ...s, exercises: [...s.exercises] }));
  }

  validate(): DomainResult<void> {
    if (this.sessions.length === 0) {
      return left(
        new InvalidTemplateStructureError(
          'TRAINING_PRESCRIPTION template must have at least one session',
        ),
      );
    }

    for (const session of this.sessions) {
      if (session.exercises.length === 0) {
        return left(
          new InvalidTemplateStructureError(
            `Session "${session.name}" must have at least one exercise`,
          ),
        );
      }

      for (const exercise of session.exercises) {
        if (!exercise.name || exercise.name.trim().length === 0) {
          return left(new InvalidTemplateStructureError('each exercise must have a name'));
        }
      }
    }

    return right(undefined);
  }

  toSnapshot(_parameterValues?: Map<string, string | number | boolean>): TemplateSnapshot {
    // Flatten sessions into a single exercise list for the Deliverable
    const exercises = this.sessions.flatMap((session) =>
      session.exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        durationSeconds: ex.durationSeconds,
        restSeconds: ex.restSeconds,
        notes: ex.notes,
      })),
    );

    return {
      type: DeliverableType.TRAINING_PRESCRIPTION,
      description: `Sessions: ${this.sessions.map((s) => s.name).join(', ')}`,
      exercises,
    };
  }
}
