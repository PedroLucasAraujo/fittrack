import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { EngagementErrorCodes } from '../errors/engagement-error-codes.js';

class InvalidTrendPercentageError extends DomainError {
  constructor(value: unknown) {
    super(
      `TrendPercentage must be a finite number; got ${String(value)}`,
      EngagementErrorCodes.INVALID_TREND_PERCENTAGE as unknown as ErrorCode,
    );
  }
}

/**
 * TrendPercentage value object.
 *
 * Represents the percentage change in engagement score week-over-week.
 * Can be negative (e.g., -20 means -20%).
 *
 * Formula: ((current - previous) / previous) * 100
 * If previous is 0 and current > 0: returns +100.
 * If both are 0: returns 0.
 */
export class TrendPercentage {
  private constructor(readonly value: number) {}

  static create(value: number): DomainResult<TrendPercentage> {
    if (!Number.isFinite(value)) {
      return left(new InvalidTrendPercentageError(value));
    }
    return right(new TrendPercentage(Math.round(value)));
  }

  /**
   * Calculates trend percentage from two scores.
   * Returns 0 when previous is 0 to avoid division by zero.
   */
  static calculate(current: number, previous: number): TrendPercentage {
    if (previous === 0) {
      return new TrendPercentage(current > 0 ? 100 : 0);
    }
    const pct = ((current - previous) / previous) * 100;
    return new TrendPercentage(Math.round(pct));
  }

  isImprovement(): boolean {
    return this.value > 0;
  }

  isDecline(): boolean {
    return this.value < 0;
  }

  equals(other: TrendPercentage): boolean {
    return this.value === other.value;
  }
}
