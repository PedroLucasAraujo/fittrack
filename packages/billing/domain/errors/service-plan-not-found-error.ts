import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

export class ServicePlanNotFoundError extends DomainError {
  constructor(planId: string) {
    super(
      `ServicePlan "${planId}" was not found.`,
      BillingErrorCodes.SERVICE_PLAN_NOT_FOUND as ErrorCode,
      { planId },
    );
  }
}
