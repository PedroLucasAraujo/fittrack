import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidInviteError extends DomainError {
  constructor() {
    super('Invalid challenge invite.', ChallengeErrorCodes.INVALID_INVITE as ErrorCode);
  }
}
