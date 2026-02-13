import { ValueObject } from './value-object';
import { DomainInvariantError } from '../errors/domain-invariant-error';
import { ErrorCodes } from '../errors/error-codes';
import type { DomainResult } from '../either/domain-result';
import { right, left } from '../either/either';

interface UTCDateTimeProps {
  value: Date;
}

/**
 * An immutable UTC instant per ADR-0010.
 *
 * All timestamps stored in the persistence layer are UTC and conform to
 * ISO 8601: `YYYY-MM-DDTHH:mm:ss.sssZ`. Field names on entities end in
 * `Utc` by convention (e.g., `occurredAtUtc`, `createdAtUtc`).
 *
 * ## Immutability
 *
 * The `value` getter returns a **defensive copy** of the internal `Date`
 * object. `Date` instances are mutable (`.setFullYear()`, `.setMonth()`, etc.)
 * and `Object.freeze` does not prevent mutation via prototype methods.
 * Returning a copy ensures that external callers cannot corrupt the stored
 * instant.
 *
 * ## Persistence / serialisation
 *
 * Use `toISO()` to obtain the canonical ISO 8601 UTC string for storage and
 * wire transfer. Use `UTCDateTime.fromISO()` when deserialising a persisted
 * value.
 */
export class UTCDateTime extends ValueObject<UTCDateTimeProps> {
  private constructor(props: UTCDateTimeProps) {
    super(props);
  }

  /** Creates a `UTCDateTime` representing the current UTC instant. */
  static now(): UTCDateTime {
    return new UTCDateTime({ value: new Date() });
  }

  /**
   * Creates a `UTCDateTime` from an existing `Date` instance (defensive copy).
   *
   * Returns `Left<DomainInvariantError>` if the provided value is not a valid
   * `Date` (e.g., `new Date('not-a-date')` produces an `Invalid Date`).
   */
  static from(date: Date): DomainResult<UTCDateTime> {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return left(
        new DomainInvariantError(
          'UTCDateTime.from() requires a valid Date instance. Received an invalid or non-Date value.',
          ErrorCodes.TEMPORAL_VIOLATION,
          { received: String(date) },
        ),
      );
    }
    // Clone with getTime() to avoid round-trip precision loss via toISOString().
    return right(new UTCDateTime({ value: new Date(date.getTime()) }));
  }

  /**
   * Parses an ISO 8601 UTC string into a `UTCDateTime`.
   *
   * The string **must** end with `Z` to enforce UTC semantics per ADR-0010 §1.
   * Offset strings such as `+03:00` are rejected to prevent silent timezone
   * confusion at the persistence boundary.
   *
   * Returns `Left<DomainInvariantError>` for non-UTC or unparseable strings.
   */
  static fromISO(iso: string): DomainResult<UTCDateTime> {
    if (typeof iso !== 'string' || !iso.endsWith('Z')) {
      return left(
        new DomainInvariantError(
          `UTCDateTime.fromISO() requires an ISO 8601 UTC string ending with "Z". Received: "${iso}".`,
          ErrorCodes.TEMPORAL_VIOLATION,
          { iso },
        ),
      );
    }

    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      return left(
        new DomainInvariantError(
          `UTCDateTime.fromISO() could not parse the ISO string: "${iso}".`,
          ErrorCodes.TEMPORAL_VIOLATION,
          { iso },
        ),
      );
    }

    return right(new UTCDateTime({ value: date }));
  }

  /**
   * Returns a **defensive copy** of the internal `Date`.
   *
   * Prefer `toISO()` for persistence and serialisation. Use this getter only
   * when a `Date` instance is required by a third-party API.
   */
  get value(): Date {
    return new Date(this.props.value.getTime());
  }

  /**
   * Returns the ISO 8601 UTC string for persistence and wire transfer.
   * Format: `YYYY-MM-DDTHH:mm:ss.sssZ` — always ends with `Z` (ADR-0010 §1).
   */
  toISO(): string {
    return this.props.value.toISOString();
  }

  toString(): string {
    return this.toISO();
  }
}
