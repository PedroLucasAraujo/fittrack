import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidChallengeDescriptionError } from '../errors/invalid-challenge-description-error.js';

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;

export interface ChallengeDescriptionProps {
  value: string;
}

export class ChallengeDescription extends ValueObject<ChallengeDescriptionProps> {
  private constructor(props: ChallengeDescriptionProps) {
    super(props);
  }

  static create(value: string): DomainResult<ChallengeDescription> {
    if (
      typeof value !== 'string' ||
      value.trim().length < MIN_LENGTH ||
      value.trim().length > MAX_LENGTH
    ) {
      return left(new InvalidChallengeDescriptionError());
    }
    return right(new ChallengeDescription({ value: value.trim() }));
  }

  get value(): string {
    return this.props.value;
  }
}
