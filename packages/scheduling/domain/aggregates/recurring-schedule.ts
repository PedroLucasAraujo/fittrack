import { AggregateRoot, UTCDateTime, generateId, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { DayOfWeek } from '../enums/day-of-week.js';
import { RecurringSession } from '../entities/recurring-session.js';
import type { RecurringSessionProps } from '../entities/recurring-session.js';

export interface RecurringScheduleProps {
  professionalProfileId: string;
  clientId: string;
  sessionId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm in professional's timezone
  timezoneUsed: string;
  sessions: RecurringSession[];
  createdAtUtc: UTCDateTime;
}

/**
 * RecurringSchedule aggregate root — represents a repeating weekly pattern
 * for a specific session between a professional and a client.
 *
 * ## Subordinate entity
 *
 * `RecurringSession` instances are owned by this aggregate. They are created
 * via `addSession()` and are not accessible directly from outside (ADR-0047).
 *
 * ## Hard limits (ADR-0041)
 *
 * Max 52 sessions per schedule (12 for WATCHLIST professionals). These limits
 * are enforced at the application layer before calling `addSession()`.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * `professionalProfileId` is immutable and non-null.
 */
export class RecurringSchedule extends AggregateRoot<RecurringScheduleProps> {
  private constructor(id: string, props: RecurringScheduleProps, version: number = 0) {
    super(id, props, version);
  }

  static create(props: {
    id?: string;
    professionalProfileId: string;
    clientId: string;
    sessionId: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    timezoneUsed: string;
  }): DomainResult<RecurringSchedule> {
    const id = props.id ?? generateId();
    const createdAtUtc = UTCDateTime.now();

    const schedule = new RecurringSchedule(id, {
      professionalProfileId: props.professionalProfileId,
      clientId: props.clientId,
      sessionId: props.sessionId,
      dayOfWeek: props.dayOfWeek,
      startTime: props.startTime,
      timezoneUsed: props.timezoneUsed,
      sessions: [],
      createdAtUtc,
    });

    return right(schedule);
  }

  static reconstitute(
    id: string,
    props: RecurringScheduleProps,
    version: number,
  ): RecurringSchedule {
    return new RecurringSchedule(id, props, version);
  }

  // ── Commands ──────────────────────────────────────────────────────────────

  /**
   * Adds a generated recurring session occurrence.
   *
   * Hard limits (ADR-0041) are enforced at the application layer before
   * calling this method. The aggregate trusts those checks.
   */
  addSession(sessionProps: RecurringSessionProps): RecurringSession {
    const sessionId = generateId();
    const session = RecurringSession.create(sessionId, sessionProps);
    this.props.sessions.push(session);
    return session;
  }

  // ── Query methods ─────────────────────────────────────────────────────────

  get sessionCount(): number {
    return this.props.sessions.length;
  }

  get unassignedSessionCount(): number {
    return this.props.sessions.filter((s) => s.bookingId === null).length;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get sessionId(): string {
    return this.props.sessionId;
  }

  get dayOfWeek(): DayOfWeek {
    return this.props.dayOfWeek;
  }

  get startTime(): string {
    return this.props.startTime;
  }

  get timezoneUsed(): string {
    return this.props.timezoneUsed;
  }

  get sessions(): ReadonlyArray<RecurringSession> {
    return [...this.props.sessions];
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }
}
