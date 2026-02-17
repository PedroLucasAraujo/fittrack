import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { BillingErrorCodes } from './billing-error-codes.js';

export class ServicePlanNotActiveError extends DomainError {
  constructor(planId: string, currentStatus: string) {
    super(
      `ServicePlan "${planId}" is not ACTIVE (current: "${currentStatus}"). Cannot initiate purchase.`,
      BillingErrorCodes.SERVICE_PLAN_NOT_ACTIVE as ErrorCode,
      { planId, currentStatus },
    );
  }
}
