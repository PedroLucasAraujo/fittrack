import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidEngagementTrendError } from '../errors/InvalidEngagementTrendError.js';

export type EngagementTrendValue = 'IMPROVING' | 'STABLE' | 'DECLINING';

const VALID_TRENDS: EngagementTrendValue[] = ['IMPROVING', 'STABLE', 'DECLINING'];

/**
 * EngagementTrend value object.
 *
 * Computed by comparing the current week's overall score to the previous week's:
 * - IMPROVING : delta >= +10
 * - DECLINING : delta <= -10
 * - STABLE    : delta in (-9, +9)
 */
export class EngagementTrend {
  private constructor(readonly value: EngagementTrendValue) {}

  static create(value: string): DomainResult<EngagementTrend> {
    if (!VALID_TRENDS.includes(value as EngagementTrendValue)) {
      return left(new InvalidEngagementTrendError(value));
    }
    return right(new EngagementTrend(value as EngagementTrendValue));
  }

  /**
   * Derives a trend from the delta between current and previous overall score.
   * @param delta current - previous
   */
  static fromDelta(delta: number): EngagementTrend {
    if (delta >= 10) return new EngagementTrend('IMPROVING');
    if (delta <= -10) return new EngagementTrend('DECLINING');
    return new EngagementTrend('STABLE');
  }

  isImproving(): boolean {
    return this.value === 'IMPROVING';
  }

  isDeclining(): boolean {
    return this.value === 'DECLINING';
  }

  isStable(): boolean {
    return this.value === 'STABLE';
  }

  equals(other: EngagementTrend): boolean {
    return this.value === other.value;
  }
}
