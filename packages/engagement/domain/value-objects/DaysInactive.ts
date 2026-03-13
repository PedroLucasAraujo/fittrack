import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { EngagementErrorCodes } from '../errors/engagement-error-codes.js';

class InvalidDaysInactiveError extends DomainError {
  constructor(value: unknown) {
    super(
      `DaysInactive must be a non-negative integer; got ${String(value)}`,
      EngagementErrorCodes.INVALID_DAYS_INACTIVE as unknown as ErrorCode,
    );
  }
}

/**
 * DaysInactive value object.
 *
 * Represents the number of days since the user's last recorded activity.
 * A value of 0 means the user was active today.
 */
export class DaysInactive {
  private constructor(readonly value: number) {}

  static create(days: number): DomainResult<DaysInactive> {
    if (!Number.isInteger(days) || days < 0) {
      return left(new InvalidDaysInactiveError(days));
    }
    return right(new DaysInactive(days));
  }

  /** True when the user has been inactive for 7+ days (churn risk threshold). */
  isChurnRisk(): boolean {
    return this.value >= 7;
  }

  equals(other: DaysInactive): boolean {
    return this.value === other.value;
  }
}
