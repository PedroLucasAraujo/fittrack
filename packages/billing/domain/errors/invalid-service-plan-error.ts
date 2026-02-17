import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

export class InvalidServicePlanError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid ServicePlan: ${reason}.`,
      BillingErrorCodes.INVALID_SERVICE_PLAN as ErrorCode,
      { reason },
    );
  }
}
