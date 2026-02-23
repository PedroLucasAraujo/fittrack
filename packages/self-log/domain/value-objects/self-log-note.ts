import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidSelfLogEntryError } from '../errors/invalid-self-log-entry-error.js';

interface SelfLogNoteProps {
  readonly value: string;
}

/**
 * User-authored note attached to a SelfLogEntry.
 *
 * ## Constraints
 *
 * - 1 to 500 characters after trimming leading/trailing whitespace.
 * - Must be non-empty.
 *
 * ## LGPD note (ADR-0037 §5 — Category A)
 *
 * Notes may contain personally authored health observations. This field is
 * subject to field-level anonymization on LGPD erasure requests — the
 * `SelfLogEntry.anonymize()` method nulls this value. The `SelfLogNote` value
 * object itself has no erasure responsibility; it is replaced by null at the
 * aggregate level.
 */
export class SelfLogNote extends ValueObject<SelfLogNoteProps> {
  static readonly MIN_LENGTH = 1;
  static readonly MAX_LENGTH = 500;

  private constructor(props: SelfLogNoteProps) {
    super(props);
  }

  /**
   * @returns Right<SelfLogNote> for valid 1–500 char input (trimmed).
   * @returns Left<InvalidSelfLogEntryError> for empty or overly long input.
   */
  static create(raw: string): DomainResult<SelfLogNote> {
    const trimmed = raw.trim();

    if (trimmed.length < SelfLogNote.MIN_LENGTH) {
      return left(new InvalidSelfLogEntryError('note must not be empty'));
    }

    if (trimmed.length > SelfLogNote.MAX_LENGTH) {
      return left(
        new InvalidSelfLogEntryError(`note must not exceed ${SelfLogNote.MAX_LENGTH} characters`),
      );
    }

    return right(new SelfLogNote({ value: trimmed }));
  }

  get value(): string {
    return this.props.value;
  }
}
