import { ValueObject } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidGoalNameError } from '../errors/invalid-goal-name-error.js';

const MIN_LENGTH = 3;
const MAX_LENGTH = 100;

interface GoalNameProps {
  value: string;
}

export class GoalName extends ValueObject<GoalNameProps> {
  private constructor(props: GoalNameProps) {
    super(props);
  }

  static create(name: string): DomainResult<GoalName> {
    if (typeof name !== 'string' || name.trim().length < MIN_LENGTH) {
      return left(new InvalidGoalNameError(`Must be at least ${MIN_LENGTH} characters long.`));
    }
    if (name.trim().length > MAX_LENGTH) {
      return left(new InvalidGoalNameError(`Must be at most ${MAX_LENGTH} characters long.`));
    }
    return right(new GoalName({ value: name.trim() }));
  }

  get value(): string {
    return this.props.value;
  }
}
