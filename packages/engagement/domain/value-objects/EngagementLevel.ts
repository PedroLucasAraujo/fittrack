import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidEngagementLevelError } from '../errors/InvalidEngagementLevelError.js';
import type { EngagementScore } from './EngagementScore.js';

export type EngagementLevelValue = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';

const VALID_LEVELS: EngagementLevelValue[] = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'];

/**
 * EngagementLevel value object.
 *
 * Thresholds (ADR-0058):
 * - VERY_HIGH : score ≥ 80
 * - HIGH      : score ≥ 60
 * - MEDIUM    : score ≥ 40
 * - LOW       : score ≥ 20
 * - VERY_LOW  : score <  20
 */
export class EngagementLevel {
  private constructor(readonly value: EngagementLevelValue) {}

  static create(value: string): DomainResult<EngagementLevel> {
    if (!VALID_LEVELS.includes(value as EngagementLevelValue)) {
      return left(new InvalidEngagementLevelError(value));
    }
    return right(new EngagementLevel(value as EngagementLevelValue));
  }

  /** Derives the level from an EngagementScore. */
  static fromScore(score: EngagementScore): EngagementLevel {
    if (score.value >= 80) return new EngagementLevel('VERY_HIGH');
    if (score.value >= 60) return new EngagementLevel('HIGH');
    if (score.value >= 40) return new EngagementLevel('MEDIUM');
    if (score.value >= 20) return new EngagementLevel('LOW');
    return new EngagementLevel('VERY_LOW');
  }

  /** True when level indicates risk of churn (LOW or VERY_LOW). */
  isAtRisk(): boolean {
    return this.value === 'LOW' || this.value === 'VERY_LOW';
  }

  equals(other: EngagementLevel): boolean {
    return this.value === other.value;
  }
}
