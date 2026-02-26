/**
 * Error code registry for the Deliverables bounded context.
 *
 * Namespaced with `DELIVERABLE.` prefix to avoid collisions with
 * core ErrorCodes and codes from other bounded contexts.
 */
export const DeliverableErrorCodes = {
  INVALID_DELIVERABLE: 'DELIVERABLE.INVALID_DELIVERABLE',
  INVALID_DELIVERABLE_TRANSITION: 'DELIVERABLE.INVALID_DELIVERABLE_TRANSITION',
  DELIVERABLE_NOT_FOUND: 'DELIVERABLE.DELIVERABLE_NOT_FOUND',
  DELIVERABLE_NOT_ACTIVE: 'DELIVERABLE.DELIVERABLE_NOT_ACTIVE',
  DELIVERABLE_NOT_DRAFT: 'DELIVERABLE.DELIVERABLE_NOT_DRAFT',
  EMPTY_EXERCISE_LIST: 'DELIVERABLE.EMPTY_EXERCISE_LIST',
  EXERCISE_NOT_FOUND: 'DELIVERABLE.EXERCISE_NOT_FOUND',
} as const;

export type DeliverableErrorCode =
  (typeof DeliverableErrorCodes)[keyof typeof DeliverableErrorCodes];
