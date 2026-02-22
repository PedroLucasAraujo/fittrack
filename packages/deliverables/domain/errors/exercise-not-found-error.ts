import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { DeliverableErrorCodes } from './deliverable-error-codes.js';

/**
 * Raised when a removeExercise call references an ExerciseAssignment id
 * that does not exist within the Deliverable's current exercise list.
 */
export class ExerciseNotFoundError extends DomainError {
  constructor(exerciseAssignmentId: string) {
    super(
      `ExerciseAssignment not found: ${exerciseAssignmentId}`,
      DeliverableErrorCodes.EXERCISE_NOT_FOUND as ErrorCode,
    );
  }
}
