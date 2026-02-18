import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidSessionTitleError } from '../errors/invalid-session-title-error.js';

interface SessionTitleProps {
  value: string;
}

/**
 * Title for a session type. Must be between 1 and 120 characters after trimming.
 */
export class SessionTitle extends ValueObject<SessionTitleProps> {
  private static readonly MIN_LENGTH = 1;
  private static readonly MAX_LENGTH = 120;

  private constructor(props: SessionTitleProps) {
    super(props);
  }

  static create(value: string): DomainResult<SessionTitle> {
    const trimmed = value.trim();

    if (trimmed.length < SessionTitle.MIN_LENGTH || trimmed.length > SessionTitle.MAX_LENGTH) {
      return left(new InvalidSessionTitleError(trimmed));
    }

    return right(new SessionTitle({ value: trimmed }));
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
