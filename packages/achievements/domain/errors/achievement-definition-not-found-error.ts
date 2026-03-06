import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AchievementErrorCodes } from './achievement-error-codes.js';

export class AchievementDefinitionNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      `Achievement definition not found: ${id}`,
      AchievementErrorCodes.ACHIEVEMENT_DEFINITION_NOT_FOUND as ErrorCode,
    );
  }
}
