import { AggregateRoot, UTCDateTime, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { SessionTitle } from '../value-objects/session-title.js';
import { DurationMinutes } from '../value-objects/duration-minutes.js';
import { SessionStatus } from '../enums/session-status.js';
import { InvalidBookingTransitionError } from '../errors/invalid-booking-transition-error.js';

export interface SessionProps {
  professionalProfileId: string;
  title: SessionTitle;
  durationMinutes: DurationMinutes;
  status: SessionStatus;
  createdAtUtc: UTCDateTime;
  archivedAtUtc: UTCDateTime | null;
}

/**
 * Session aggregate root — a sellable time unit defined by a professional.
 *
 * Sessions are referenced by ID from Booking and RecurringSchedule (ADR-0047).
 * A session must be ACTIVE to be used for new bookings. Archiving prevents
 * new bookings but does not cancel existing ones.
 *
 * Tenant isolation: `professionalProfileId` is immutable and non-null (ADR-0025).
 */
export class Session extends AggregateRoot<SessionProps> {
  private constructor(id: string, props: SessionProps, version: number = 0) {
    super(id, props, version);
  }

  static create(props: {
    id?: string;
    professionalProfileId: string;
    title: SessionTitle;
    durationMinutes: DurationMinutes;
  }): DomainResult<Session> {
    const id = props.id ?? generateId();
    const createdAtUtc = UTCDateTime.now();

    const session = new Session(id, {
      professionalProfileId: props.professionalProfileId,
      title: props.title,
      durationMinutes: props.durationMinutes,
      status: SessionStatus.ACTIVE,
      createdAtUtc,
      archivedAtUtc: null,
    });

    return right(session);
  }

  static reconstitute(id: string, props: SessionProps, version: number): Session {
    return new Session(id, props, version);
  }

  // ── State transitions ─────────────────────────────────────────────────────

  /** ACTIVE → ARCHIVED. Prevents new bookings. */
  archive(): DomainResult<void> {
    if (this.props.status !== SessionStatus.ACTIVE) {
      return left(new InvalidBookingTransitionError(this.props.status, SessionStatus.ARCHIVED));
    }

    this.props.status = SessionStatus.ARCHIVED;
    this.props.archivedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  // ── Query methods ─────────────────────────────────────────────────────────

  isActive(): boolean {
    return this.props.status === SessionStatus.ACTIVE;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get title(): SessionTitle {
    return this.props.title;
  }

  get durationMinutes(): DurationMinutes {
    return this.props.durationMinutes;
  }

  get status(): SessionStatus {
    return this.props.status;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get archivedAtUtc(): UTCDateTime | null {
    return this.props.archivedAtUtc;
  }
}
