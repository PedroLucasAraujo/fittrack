/**
 * Error code registry for the Execution bounded context.
 *
 * Namespaced with `EXECUTION.` prefix to avoid collisions with
 * core ErrorCodes and codes from other bounded contexts.
 */
export const ExecutionErrorCodes = {
  INVALID_EXECUTION: 'EXECUTION.INVALID_EXECUTION',
  EXECUTION_NOT_FOUND: 'EXECUTION.EXECUTION_NOT_FOUND',
  ACCESS_GRANT_INVALID: 'EXECUTION.ACCESS_GRANT_INVALID',
  DELIVERABLE_INACTIVE: 'EXECUTION.DELIVERABLE_INACTIVE',
  CORRECTION_REASON_REQUIRED: 'EXECUTION.CORRECTION_REASON_REQUIRED',
} as const;

export type ExecutionErrorCode = (typeof ExecutionErrorCodes)[keyof typeof ExecutionErrorCodes];
