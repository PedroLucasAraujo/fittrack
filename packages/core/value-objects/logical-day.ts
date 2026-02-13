import { ValueObject } from './value-object';
import { DomainInvariantError } from '../errors/domain-invariant-error';
import { ErrorCodes } from '../errors/error-codes';
import type { DomainResult } from '../either/domain-result';
import { right, left } from '../either/either';

interface LogicalDayProps {
  value: string; // YYYY-MM-DD
}

/**
 * A calendar date from the perspective of a user's local timezone at the
 * moment a time-based business event occurred. Stored as an ISO date string
 * in `YYYY-MM-DD` format.
 *
 * **logicalDay is a business concept, not a value derived from a UTC timestamp
 * at query time.** Once recorded on an entity it is never recomputed (ADR-0010
 * §5). The following events do not alter a persisted logicalDay:
 *   - User changes their configured timezone.
 *   - IANA timezone database updates DST rules for a past date.
 *   - System migrations or data backfills.
 *
 * ## Authoritative computation rule (ADR-0010 §2)
 *
 * ```
 * logicalDay = toLocalDate(occurredAtUtc, timezoneUsed)
 * ```
 *
 * Use `LogicalDay.fromDate(occurredAtUtc, timezoneUsed)` for all entity
 * creation paths. Use `LogicalDay.create(isoString)` only when reconstituting
 * from a persistence layer value that was already stored correctly.
 */
export class LogicalDay extends ValueObject<LogicalDayProps> {
  /** YYYY-MM-DD format guard — groups capture year, month, day. */
  private static readonly FORMAT_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

  private constructor(props: LogicalDayProps) {
    super(props);
  }

  /**
   * Creates a `LogicalDay` from a pre-formatted ISO date string (`YYYY-MM-DD`).
   *
   * Validates both the string format and the calendar semantics (rejects month
   * 13, day 32, February 30, etc. using UTC Date arithmetic).
   *
   * Use this factory when reconstituting a logicalDay that was already
   * persisted. For all new entity creation paths use `LogicalDay.fromDate()`.
   *
   * Returns `Left<DomainInvariantError>` for any invalid input.
   */
  static create(value: string): DomainResult<LogicalDay> {
    const match = LogicalDay.FORMAT_REGEX.exec(value);

    if (!match) {
      return left(
        new DomainInvariantError(
          `Invalid logicalDay format: "${value}". Expected YYYY-MM-DD.`,
          ErrorCodes.INVALID_LOGICAL_DAY,
          { value },
        ),
      );
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    if (month < 1 || month > 12) {
      return left(
        new DomainInvariantError(
          `Invalid logicalDay: month ${month} is out of the valid range [1, 12]. Received: "${value}".`,
          ErrorCodes.INVALID_LOGICAL_DAY,
          { value, month },
        ),
      );
    }

    // Validate the day using UTC Date construction — this correctly handles
    // month-specific limits (February 28/29, 30-day months, etc.).
    const probeDate = new Date(Date.UTC(year, month - 1, day));
    const isCalendarDate =
      probeDate.getUTCFullYear() === year &&
      probeDate.getUTCMonth() === month - 1 &&
      probeDate.getUTCDate() === day;

    if (!isCalendarDate) {
      return left(
        new DomainInvariantError(
          `Invalid logicalDay: "${value}" does not represent a real calendar date.`,
          ErrorCodes.INVALID_LOGICAL_DAY,
          { value },
        ),
      );
    }

    return right(new LogicalDay({ value }));
  }

  /**
   * Derives a `LogicalDay` from a UTC instant and an IANA timezone identifier,
   * applying the canonical logicalDay computation rule from ADR-0010 §2:
   *
   * ```
   * logicalDay = toLocalDate(occurredAtUtc, timezoneUsed)
   * ```
   *
   * This is the **authoritative factory** for all time-based entity creation.
   * The `Intl.DateTimeFormat` API with the `en-CA` locale formats dates as
   * `YYYY-MM-DD`, matching the logicalDay storage format exactly. DST
   * transitions are handled by the IANA TZDB embedded in the runtime.
   *
   * Example:
   * ```typescript
   * // occurredAtUtc = 2024-03-15T02:30:00Z, timezoneUsed = "America/Sao_Paulo" (UTC-3)
   * // → logicalDay = "2024-03-14"  (March 14, not March 15)
   * LogicalDay.fromDate(new Date('2024-03-15T02:30:00Z'), 'America/Sao_Paulo')
   * ```
   *
   * Returns `Left<DomainInvariantError>` for invalid or unrecognised IANA
   * timezone identifiers.
   */
  static fromDate(
    occurredAtUtc: Date,
    timezoneUsed: string,
  ): DomainResult<LogicalDay> {
    try {
      // en-CA locale produces "YYYY-MM-DD" which matches logicalDay format.
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezoneUsed,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const dateString = formatter.format(occurredAtUtc);
      return right(new LogicalDay({ value: dateString }));
    } catch {
      return left(
        new DomainInvariantError(
          `Invalid IANA timezone identifier: "${timezoneUsed}". ` +
            'Use a valid IANA TZDB identifier (e.g., "America/Sao_Paulo", "UTC").',
          ErrorCodes.INVALID_TIMEZONE,
          { timezoneUsed },
        ),
      );
    }
  }

  /** The stored ISO date string in `YYYY-MM-DD` format. */
  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
