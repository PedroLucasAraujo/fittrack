import { AggregateRoot, UTCDateTime, LogicalDay, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { BookingStatus } from '../enums/booking-status.js';
import { InvalidBookingTransitionError } from '../errors/invalid-booking-transition-error.js';
import { BookingCannotBeRescheduledError } from '../errors/booking-cannot-be-rescheduled-error.js';
import { ReschedulePolicyViolationError } from '../errors/reschedule-policy-violation-error.js';
import type { ReschedulingPolicy } from '../value-objects/rescheduling-policy.js';

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
  rescheduleCount: number;
  lastRescheduledAtUtc: UTCDateTime | null;
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
 * - `logicalDay`: calendar date of the appointment in the client's timezone.
 *   Updated on reschedule to reflect the new appointment date.
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
      rescheduleCount: 0,
      lastRescheduledAtUtc: null,
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

  // ── Rescheduling (ADR-0022: no RESCHEDULED state; reschedule is an event) ─

  /**
   * Validates whether this booking may be rescheduled under the given policy.
   *
   * Checks (in order):
   * 1. Booking must be open (PENDING or CONFIRMED) — terminal states are ineligible.
   * 2. Reschedule count must not exceed `policy.maxReschedules`.
   * 3. Current scheduled time must be at least `policy.minNoticeHours` in the future.
   *
   * Call this before `reschedule()`. The use case is also responsible for
   * validating the *new* time (future, business hours) and availability.
   */
  canBeRescheduled(policy: ReschedulingPolicy): DomainResult<void> {
    if (this.isTerminal()) {
      return left(new BookingCannotBeRescheduledError(this.props.status));
    }

    if (this.props.rescheduleCount >= policy.maxReschedules) {
      return left(
        new ReschedulePolicyViolationError(
          `Maximum reschedules (${policy.maxReschedules}) exceeded. Current count: ${this.props.rescheduleCount}`,
        ),
      );
    }

    const msUntil = this.props.scheduledAtUtc.value.getTime() - Date.now();
    const hoursUntil = msUntil / (1000 * 60 * 60);

    if (hoursUntil < policy.minNoticeHours) {
      return left(
        new ReschedulePolicyViolationError(
          `Minimum notice of ${policy.minNoticeHours}h required. Booking starts in ${hoursUntil.toFixed(1)}h`,
        ),
      );
    }

    return right(undefined);
  }

  /**
   * Applies a reschedule: updates `scheduledAtUtc`, `logicalDay`,
   * increments `rescheduleCount`, and records `lastRescheduledAtUtc`.
   *
   * `logicalDay` is updated here because for Booking it represents the
   * calendar date of the *future* appointment, not a historical creation date.
   * The use case must compute `newLogicalDay` via
   * `LogicalDay.fromDate(newScheduledAtUtc.value, booking.timezoneUsed)`.
   *
   * Assumes all pre-conditions (policy, availability, new-time validation) have
   * already been verified by the use case. Status remains unchanged (ADR-0022).
   *
   * The use case is responsible for publishing `BookingRescheduled` after save
   * (ADR-0009: events dispatched by use case, not by aggregate).
   */
  reschedule(newScheduledAtUtc: UTCDateTime, newLogicalDay: LogicalDay): DomainResult<void> {
    this.props.scheduledAtUtc = newScheduledAtUtc;
    this.props.logicalDay = newLogicalDay;
    this.props.rescheduleCount += 1;
    this.props.lastRescheduledAtUtc = UTCDateTime.now();
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

  get rescheduleCount(): number {
    return this.props.rescheduleCount;
  }

  get lastRescheduledAtUtc(): UTCDateTime | null {
    return this.props.lastRescheduledAtUtc;
  }
}
