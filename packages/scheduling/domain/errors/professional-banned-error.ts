import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class ProfessionalBannedError extends DomainError {
  constructor(professionalProfileId: string) {
    super(
      `Operation blocked: professional is banned.`,
      SchedulingErrorCodes.PROFESSIONAL_BANNED as ErrorCode,
      { professionalProfileId },
    );
  }
}
