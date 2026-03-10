import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidChallengeNameError } from '../errors/invalid-challenge-name-error.js';

const MIN_LENGTH = 3;
const MAX_LENGTH = 100;

export interface ChallengeNameProps {
  value: string;
}

export class ChallengeName extends ValueObject<ChallengeNameProps> {
  private constructor(props: ChallengeNameProps) {
    super(props);
  }

  static create(value: string): DomainResult<ChallengeName> {
    if (
      typeof value !== 'string' ||
      value.trim().length < MIN_LENGTH ||
      value.trim().length > MAX_LENGTH
    ) {
      return left(new InvalidChallengeNameError());
    }
    return right(new ChallengeName({ value: value.trim() }));
  }

  get value(): string {
    return this.props.value;
  }
}
