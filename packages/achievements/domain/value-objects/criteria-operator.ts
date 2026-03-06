import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidOperatorError } from '../errors/invalid-operator-error.js';

export const CriteriaOperatorType = {
  GREATER_THAN_OR_EQUAL: '>=',
  GREATER_THAN: '>',
  EQUAL: '==',
} as const;

export type CriteriaOperatorValue =
  (typeof CriteriaOperatorType)[keyof typeof CriteriaOperatorType];

/**
 * Value object representing the comparison operator used in AchievementCriteria.
 */
export class CriteriaOperator {
  private constructor(readonly value: CriteriaOperatorValue) {}

  static create(value: string): DomainResult<CriteriaOperator> {
    const validValues: string[] = Object.values(CriteriaOperatorType);
    if (!validValues.includes(value)) {
      return left(new InvalidOperatorError(value));
    }
    return right(new CriteriaOperator(value as CriteriaOperatorValue));
  }

  evaluate(current: number, target: number): boolean {
    switch (this.value) {
      case CriteriaOperatorType.GREATER_THAN_OR_EQUAL:
        return current >= target;
      case CriteriaOperatorType.GREATER_THAN:
        return current > target;
      case CriteriaOperatorType.EQUAL:
        return current === target;
    }
  }

  equals(other: CriteriaOperator): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
