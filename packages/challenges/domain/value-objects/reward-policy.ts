import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidRewardPolicyError } from '../errors/invalid-reward-policy-error.js';

export type RewardPolicyValue = 'WINNER' | 'TOP_3' | 'TOP_10' | 'ALL_COMPLETERS';

const VALID_POLICIES: RewardPolicyValue[] = ['WINNER', 'TOP_3', 'TOP_10', 'ALL_COMPLETERS'];

export interface RewardPolicyProps {
  value: RewardPolicyValue;
}

export class RewardPolicy extends ValueObject<RewardPolicyProps> {
  private constructor(props: RewardPolicyProps) {
    super(props);
  }

  static create(value: string): DomainResult<RewardPolicy> {
    if (!VALID_POLICIES.includes(value as RewardPolicyValue)) {
      return left(new InvalidRewardPolicyError());
    }
    return right(new RewardPolicy({ value: value as RewardPolicyValue }));
  }

  get value(): RewardPolicyValue {
    return this.props.value;
  }

  /**
   * Returns the eligible rank positions for this policy.
   * Returns null for ALL_COMPLETERS (all finishers are eligible regardless of rank).
   */
  getEligibleRanks(): number[] | null {
    switch (this.props.value) {
      case 'WINNER':
        return [1];
      case 'TOP_3':
        return [1, 2, 3];
      case 'TOP_10':
        return Array.from({ length: 10 }, (_, i) => i + 1);
      case 'ALL_COMPLETERS':
        return null;
    }
  }

  isWinner(): boolean {
    return this.props.value === 'WINNER';
  }

  isTop3(): boolean {
    return this.props.value === 'TOP_3';
  }

  isTop10(): boolean {
    return this.props.value === 'TOP_10';
  }

  isAllCompleters(): boolean {
    return this.props.value === 'ALL_COMPLETERS';
  }
}
