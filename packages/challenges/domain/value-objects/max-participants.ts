import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidParticipantsCountError } from '../errors/invalid-participants-count-error.js';

export interface MaxParticipantsProps {
  value: number;
}

export class MaxParticipants extends ValueObject<MaxParticipantsProps> {
  private constructor(props: MaxParticipantsProps) {
    super(props);
  }

  static create(value: number): DomainResult<MaxParticipants> {
    if (!Number.isInteger(value) || value < 1) {
      return left(
        new InvalidParticipantsCountError(
          'Maximum participants must be a positive integer of at least 1.',
        ),
      );
    }
    return right(new MaxParticipants({ value }));
  }

  get value(): number {
    return this.props.value;
  }

  isFull(currentCount: number): boolean {
    return currentCount >= this.props.value;
  }
}
