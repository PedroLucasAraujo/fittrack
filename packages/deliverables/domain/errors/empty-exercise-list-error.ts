import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { DeliverableErrorCodes } from './deliverable-error-codes.js';

/**
 * Raised when attempting to activate a TRAINING_PRESCRIPTION Deliverable
 * that has no ExerciseAssignments.
 *
 * A TRAINING_PRESCRIPTION without exercises is not a valid prescription (ADR-0044 §2).
 */
export class EmptyExerciseListError extends DomainError {
  constructor(deliverableId: string) {
    super(
      `Cannot activate TRAINING_PRESCRIPTION Deliverable with no exercises: ${deliverableId}`,
      DeliverableErrorCodes.EMPTY_EXERCISE_LIST as ErrorCode,
    );
  }
}
