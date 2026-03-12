import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class UnauthorizedProfessionalError extends DomainError {
  constructor() {
    super(
      'Professional is not authorized to manage this goal.',
      GoalsErrorCodes.UNAUTHORIZED_PROFESSIONAL as ErrorCode,
    );
  }
}
