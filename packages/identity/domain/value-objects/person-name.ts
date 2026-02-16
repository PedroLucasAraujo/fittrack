import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidPersonNameError } from '../errors/invalid-person-name-error.js';

interface PersonNameProps {
  value: string;
}

const MIN_LENGTH = 2;
const MAX_LENGTH = 120;

/**
 * Human-readable display name for a user or professional.
 *
 * Trims whitespace and enforces a length between 2 and 120 characters.
 * PersonName is Category C (Identification/PII) under ADR-0037.
 */
export class PersonName extends ValueObject<PersonNameProps> {
  private constructor(props: PersonNameProps) {
    super(props);
  }

  static create(value: string): DomainResult<PersonName> {
    const trimmed = value.trim();

    if (trimmed.length < MIN_LENGTH) {
      return left(
        new InvalidPersonNameError(value, `must be at least ${MIN_LENGTH} characters`),
      );
    }

    if (trimmed.length > MAX_LENGTH) {
      return left(
        new InvalidPersonNameError(value, `must be at most ${MAX_LENGTH} characters`),
      );
    }

    return right(new PersonName({ value: trimmed }));
  }

  get value(): string {
    return this.props.value;
  }
}
