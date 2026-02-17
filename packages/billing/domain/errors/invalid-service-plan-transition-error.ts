import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

export class InvalidServicePlanTransitionError extends DomainError {
  constructor(currentStatus: string, attemptedStatus: string) {
    super(
      `Cannot transition ServicePlan from "${currentStatus}" to "${attemptedStatus}".`,
      BillingErrorCodes.INVALID_SERVICE_PLAN_TRANSITION as ErrorCode,
      { currentStatus, attemptedStatus },
    );
  }
}
