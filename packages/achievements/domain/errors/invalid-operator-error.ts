import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AchievementErrorCodes } from './achievement-error-codes.js';

export class InvalidOperatorError extends DomainError {
  constructor(value: string) {
    super(
      `Invalid criteria operator: "${value}" is not a recognized operator`,
      AchievementErrorCodes.INVALID_OPERATOR as ErrorCode,
    );
  }
}
