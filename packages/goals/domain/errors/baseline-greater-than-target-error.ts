import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class BaselineGreaterThanTargetError extends DomainError {
  constructor() {
    super(
      'Baseline and target values must differ. Use a target greater than baseline (increasing goal) or less than baseline (decreasing goal).',
      GoalsErrorCodes.BASELINE_GREATER_THAN_TARGET as ErrorCode,
    );
  }
}
