import { AggregateRoot, UTCDateTime, LogicalDay, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { BookingStatus } from '../enums/booking-status.js';
import { InvalidBookingTransitionError } from '../errors/invalid-booking-transition-error.js';

export interface BookingProps {
  professionalProfileId: string;
  clientId: string;
  sessionId: string;
  status: BookingStatus;
  scheduledAtUtc: UTCDateTime;
  logicalDay: LogicalDay;
  timezoneUsed: string;
  cancelledBy: string | null;
  cancellationReason: string | null;
  cancelledAtUtc: UTCDateTime | null;
  completedAtUtc: UTCDateTime | null;
  executionId: string | null;
  createdAtUtc: UTCDateTime;
}

/**
 * Booking aggregate root — represents a scheduled appointment between a
 * professional and a client for a specific session.
 *
 * ## State machine (ADR-0008)
 *
 * ```
 * PENDING → CONFIRMED | CANCELLED_BY_CLIENT | CANCELLED_BY_PROFESSIONAL
 * CONFIRMED → CANCELLED_BY_CLIENT | CANCELLED_BY_PROFESSIONAL |
 *             CANCELLED_BY_SYSTEM | COMPLETED | NO_SHOW
 * ```
 *
 * Terminal states: CANCELLED_*, COMPLETED, NO_SHOW.
 *
 * ## Temporal invariants (ADR-0010)
 *
 * - `scheduledAtUtc`: precise UTC instant of the appointment.
 * - `logicalDay`: computed in client's timezone at creation, immutable.
 * - `timezoneUsed`: client's IANA timezone at creation, immutable.
 *
 * ## Concurrency (ADR-0006)
 *
 * Carries optimistic locking `version`. Double-booking prevented at both
 * domain layer (application-layer check) and database layer (partial unique index).
 *
 * ## Tenant isolation (ADR-0025)
 *
 * `professionalProfileId` is immutable and non-null. All repository queries
 * must include it.
 */
export class Booking extends AggregateRoot<BookingProps> {
  private constructor(id: string, props: BookingProps, version: number = 0) {
    super(id, props, version);
  }

  static create(props: {
    id?: string;
    professionalProfileId: string;
    clientId: string;
    sessionId: string;
    scheduledAtUtc: UTCDateTime;
    logicalDay: LogicalDay;
    timezoneUsed: string;
  }): DomainResult<Booking> {
    const id = props.id ?? generateId();
    const createdAtUtc = UTCDateTime.now();

    const booking = new Booking(id, {
      professionalProfileId: props.professionalProfileId,
      clientId: props.clientId,
      sessionId: props.sessionId,
      status: BookingStatus.PENDING,
      scheduledAtUtc: props.scheduledAtUtc,
      logicalDay: props.logicalDay,
      timezoneUsed: props.timezoneUsed,
      cancelledBy: null,
      cancellationReason: null,
      cancelledAtUtc: null,
      completedAtUtc: null,
      executionId: null,
      createdAtUtc,
    });

    return right(booking);
  }

  static reconstitute(id: string, props: BookingProps, version: number): Booking {
    return new Booking(id, props, version);
  }

  // ── State transitions (ADR-0008) ──────────────────────────────────────────

  /** PENDING → CONFIRMED. */
  confirm(): DomainResult<void> {
    if (this.props.status !== BookingStatus.PENDING) {
      return left(new InvalidBookingTransitionError(this.props.status, BookingStatus.CONFIRMED));
    }

    this.props.status = BookingStatus.CONFIRMED;
    return right(undefined);
  }

  /** PENDING | CONFIRMED → CANCELLED_BY_CLIENT. */
  cancelByClient(reason: string): DomainResult<void> {
    const allowed = [BookingStatus.PENDING, BookingStatus.CONFIRMED];

    if (!allowed.includes(this.props.status)) {
      return left(
        new InvalidBookingTransitionError(this.props.status, BookingStatus.CANCELLED_BY_CLIENT),
      );
    }

    this.props.status = BookingStatus.CANCELLED_BY_CLIENT;
    this.props.cancelledBy = 'CLIENT';
    this.props.cancellationReason = reason;
    this.props.cancelledAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /** PENDING | CONFIRMED → CANCELLED_BY_PROFESSIONAL. */
  cancelByProfessional(reason: string): DomainResult<void> {
    const allowed = [BookingStatus.PENDING, BookingStatus.CONFIRMED];

    if (!allowed.includes(this.props.status)) {
      return left(
        new InvalidBookingTransitionError(
          this.props.status,
          BookingStatus.CANCELLED_BY_PROFESSIONAL,
        ),
      );
    }

    this.props.status = BookingStatus.CANCELLED_BY_PROFESSIONAL;
    this.props.cancelledBy = 'PROFESSIONAL';
    this.props.cancellationReason = reason;
    this.props.cancelledAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /** CONFIRMED → CANCELLED_BY_SYSTEM (e.g., AccessGrant revocation). */
  cancelBySystem(reason: string): DomainResult<void> {
    if (this.props.status !== BookingStatus.CONFIRMED) {
      return left(
        new InvalidBookingTransitionError(this.props.status, BookingStatus.CANCELLED_BY_SYSTEM),
      );
    }

    this.props.status = BookingStatus.CANCELLED_BY_SYSTEM;
    this.props.cancelledBy = 'SYSTEM';
    this.props.cancellationReason = reason;
    this.props.cancelledAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /** CONFIRMED → COMPLETED. Requires executionId reference. */
  complete(executionId: string): DomainResult<void> {
    if (this.props.status !== BookingStatus.CONFIRMED) {
      return left(new InvalidBookingTransitionError(this.props.status, BookingStatus.COMPLETED));
    }

    this.props.status = BookingStatus.COMPLETED;
    this.props.completedAtUtc = UTCDateTime.now();
    this.props.executionId = executionId;
    return right(undefined);
  }

  /** CONFIRMED → NO_SHOW. */
  markNoShow(): DomainResult<void> {
    if (this.props.status !== BookingStatus.CONFIRMED) {
      return left(new InvalidBookingTransitionError(this.props.status, BookingStatus.NO_SHOW));
    }

    this.props.status = BookingStatus.NO_SHOW;
    return right(undefined);
  }

  // ── Query methods ─────────────────────────────────────────────────────────

  isTerminal(): boolean {
    return [
      BookingStatus.CANCELLED_BY_CLIENT,
      BookingStatus.CANCELLED_BY_PROFESSIONAL,
      BookingStatus.CANCELLED_BY_SYSTEM,
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW,
    ].includes(this.props.status);
  }

  isOpen(): boolean {
    return (
      this.props.status === BookingStatus.PENDING || this.props.status === BookingStatus.CONFIRMED
    );
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

  get status(): BookingStatus {
    return this.props.status;
  }

  get scheduledAtUtc(): UTCDateTime {
    return this.props.scheduledAtUtc;
  }

  get logicalDay(): LogicalDay {
    return this.props.logicalDay;
  }

  get timezoneUsed(): string {
    return this.props.timezoneUsed;
  }

  get cancelledBy(): string | null {
    return this.props.cancelledBy;
  }

  get cancellationReason(): string | null {
    return this.props.cancellationReason;
  }

  get cancelledAtUtc(): UTCDateTime | null {
    return this.props.cancelledAtUtc;
  }

  get completedAtUtc(): UTCDateTime | null {
    return this.props.completedAtUtc;
  }

  get executionId(): string | null {
    return this.props.executionId;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }
}
