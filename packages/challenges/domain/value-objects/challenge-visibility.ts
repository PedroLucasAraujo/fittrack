import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidVisibilityError } from '../errors/invalid-visibility-error.js';

export type ChallengeVisibilityValue = 'PUBLIC' | 'PROFESSIONAL' | 'PRIVATE';

const VALID_VISIBILITIES: ChallengeVisibilityValue[] = ['PUBLIC', 'PROFESSIONAL', 'PRIVATE'];

export interface ChallengeVisibilityProps {
  value: ChallengeVisibilityValue;
}

export class ChallengeVisibility extends ValueObject<ChallengeVisibilityProps> {
  private constructor(props: ChallengeVisibilityProps) {
    super(props);
  }

  static create(value: string): DomainResult<ChallengeVisibility> {
    if (!VALID_VISIBILITIES.includes(value as ChallengeVisibilityValue)) {
      return left(new InvalidVisibilityError());
    }
    return right(new ChallengeVisibility({ value: value as ChallengeVisibilityValue }));
  }

  get value(): ChallengeVisibilityValue {
    return this.props.value;
  }

  isPublic(): boolean {
    return this.props.value === 'PUBLIC';
  }

  isProfessional(): boolean {
    return this.props.value === 'PROFESSIONAL';
  }

  isPrivate(): boolean {
    return this.props.value === 'PRIVATE';
  }

  requiresInvite(): boolean {
    return this.props.value === 'PRIVATE';
  }
}
