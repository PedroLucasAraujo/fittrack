import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { RiskErrorCodes } from './risk-error-codes.js';

export class ProfessionalRiskNotFoundError extends DomainError {
  constructor(professionalProfileId: string) {
    super(
      `ProfessionalProfile "${professionalProfileId}" was not found.`,
      RiskErrorCodes.PROFESSIONAL_NOT_FOUND as ErrorCode,
      { professionalProfileId },
    );
  }
}
