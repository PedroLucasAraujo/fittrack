import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidChallengeTypeError } from '../errors/invalid-challenge-type-error.js';

export type ChallengeTypeValue = 'INDIVIDUAL' | 'COMMUNITY' | 'HEAD_TO_HEAD';

const VALID_TYPES: ChallengeTypeValue[] = ['INDIVIDUAL', 'COMMUNITY', 'HEAD_TO_HEAD'];

export interface ChallengeTypeProps {
  value: ChallengeTypeValue;
}

export class ChallengeType extends ValueObject<ChallengeTypeProps> {
  private constructor(props: ChallengeTypeProps) {
    super(props);
  }

  static create(value: string): DomainResult<ChallengeType> {
    if (!VALID_TYPES.includes(value as ChallengeTypeValue)) {
      return left(new InvalidChallengeTypeError());
    }
    return right(new ChallengeType({ value: value as ChallengeTypeValue }));
  }

  get value(): ChallengeTypeValue {
    return this.props.value;
  }

  isIndividual(): boolean {
    return this.props.value === 'INDIVIDUAL';
  }

  isCommunity(): boolean {
    return this.props.value === 'COMMUNITY';
  }

  isHeadToHead(): boolean {
    return this.props.value === 'HEAD_TO_HEAD';
  }

  getMinParticipants(): number {
    if (this.props.value === 'HEAD_TO_HEAD') return 2;
    return 1;
  }

  getMaxParticipants(): number | null {
    if (this.props.value === 'INDIVIDUAL') return 1;
    if (this.props.value === 'HEAD_TO_HEAD') return 2;
    return null;
  }
}
