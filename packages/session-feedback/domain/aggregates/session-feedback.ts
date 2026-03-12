import { AggregateRoot, UTCDateTime, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { SessionRating } from '../value-objects/session-rating.js';
import type { FeedbackComment } from '../value-objects/feedback-comment.js';
import type { FeedbackFlagReason } from '../value-objects/feedback-flag-reason.js';
import { FeedbackAlreadyFlaggedError } from '../errors/feedback-already-flagged-error.js';
import { FeedbackAlreadyHiddenError } from '../errors/feedback-already-hidden-error.js';
import { InvalidFeedbackError } from '../errors/invalid-feedback-error.js';

export interface SessionFeedbackProps {
  /**
   * Owning professional — tenant isolation key (ADR-0025). Immutable.
   * Cross-aggregate reference: ID only (ADR-0047).
   */
  professionalProfileId: string;

  /**
   * Client who submitted the feedback. Immutable.
   * Cross-aggregate reference: ID only (ADR-0047).
   */
  clientId: string;

  /**
   * Booking this feedback belongs to. Immutable. 1:1 relationship.
   * Cross-aggregate reference: ID only (ADR-0047).
   */
  bookingId: string;

  /** Star rating (1–5). Immutable after creation (ADR-0011). */
  rating: SessionRating;

  /** Optional free-text comment (10–500 chars). Immutable after creation. */
  comment: FeedbackComment | null;

  /**
   * Denormalized date of the session (from booking.scheduledAtUtc).
   * Stored as ISO date string (YYYY-MM-DD) to avoid joins on read.
   * Immutable.
   */
  sessionDate: string;

  /** UTC instant when the client submitted the feedback. Immutable. */
  submittedAtUtc: UTCDateTime;

  /**
   * UTC instant when this feedback was flagged for moderation (ADR-0022).
   * Null if not flagged. Using timestamp instead of enum status.
   */
  flaggedAtUtc: UTCDateTime | null;

  /** Reason for the flag. Null if not flagged. */
  flagReason: FeedbackFlagReason | null;

  /**
   * UTC instant when this feedback was hidden by an admin (ADR-0022).
   * Null if visible. Hidden feedbacks do NOT count in risk detection.
   */
  hiddenAtUtc: UTCDateTime | null;

  /** Whether the professional has opened and read this feedback. */
  reviewedByProfessional: boolean;

  /** UTC instant the professional first reviewed this feedback. Null until reviewed. */
  reviewedAtUtc: UTCDateTime | null;
}

/**
 * SessionFeedback aggregate root — private quality-assurance record of a
 * client's experience during a single completed session (ADR-0057).
 *
 * ## Immutability (ADR-0011)
 * Once submitted, the rating and comment cannot be changed by the client.
 * Admins may hide (soft-delete) but never permanently delete a feedback.
 *
 * ## Visibility (ADR-0057 §8)
 * Feedbacks are private: the professional sees his own, admin sees all,
 * client sees only his own. NOT public like ProfessionalReview.
 *
 * ## Timestamp-based state (ADR-0022)
 * State is represented via timestamps (flaggedAtUtc, hiddenAtUtc), NOT enums.
 *
 * ## Risk detection (ADR-0057 §5)
 * Hidden feedbacks do NOT count toward risk thresholds.
 * Rating ≤ 2 is considered negative and triggers risk evaluation.
 *
 * ## Cross-aggregate references (ADR-0047)
 * professionalProfileId, clientId, bookingId are string IDs — no live objects.
 */
export class SessionFeedback extends AggregateRoot<SessionFeedbackProps> {
  private constructor(id: string, props: SessionFeedbackProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new SessionFeedback in visible, unflagged state.
   *
   * All pre-conditions (booking COMPLETED, 48h window, uniqueness, client match)
   * must be enforced by the Application layer before calling this factory.
   */
  static create(props: {
    id?: string;
    professionalProfileId: string;
    clientId: string;
    bookingId: string;
    rating: SessionRating;
    comment: FeedbackComment | null;
    sessionDate: string;
    submittedAtUtc: UTCDateTime;
  }): DomainResult<SessionFeedback> {
    if (!props.professionalProfileId || props.professionalProfileId.trim().length === 0) {
      return left(new InvalidFeedbackError('professionalProfileId is required'));
    }
    if (!props.clientId || props.clientId.trim().length === 0) {
      return left(new InvalidFeedbackError('clientId is required'));
    }
    if (!props.bookingId || props.bookingId.trim().length === 0) {
      return left(new InvalidFeedbackError('bookingId is required'));
    }
    if (!props.sessionDate || props.sessionDate.trim().length === 0) {
      return left(new InvalidFeedbackError('sessionDate is required'));
    }

    const id = props.id ?? generateId();
    const feedback = new SessionFeedback(
      id,
      {
        professionalProfileId: props.professionalProfileId,
        clientId: props.clientId,
        bookingId: props.bookingId,
        rating: props.rating,
        comment: props.comment,
        sessionDate: props.sessionDate,
        submittedAtUtc: props.submittedAtUtc,
        flaggedAtUtc: null,
        flagReason: null,
        hiddenAtUtc: null,
        reviewedByProfessional: false,
        reviewedAtUtc: null,
      },
      0,
    );

    return right(feedback);
  }

  /** Reconstitutes a feedback from persistence. */
  static reconstitute(id: string, props: SessionFeedbackProps, version: number): SessionFeedback {
    return new SessionFeedback(id, props, version);
  }

  // ── Moderation operations ─────────────────────────────────────────────────

  /**
   * Flags this feedback for moderation review.
   * Only the owning professional or an admin may flag a feedback.
   * Returns the flaggedAtUtc timestamp on success.
   * Returns Left<FeedbackAlreadyFlaggedError> if already flagged.
   */
  flag(reason: FeedbackFlagReason): DomainResult<UTCDateTime> {
    if (this.props.flaggedAtUtc !== null) {
      return left(new FeedbackAlreadyFlaggedError(this.id));
    }
    const now = UTCDateTime.now();
    this.props.flaggedAtUtc = now;
    this.props.flagReason = reason;
    return right(now);
  }

  /**
   * Hides this feedback (admin soft-delete).
   * Hidden feedbacks do NOT count in risk detection.
   * Returns the hiddenAtUtc timestamp on success.
   * Returns Left<FeedbackAlreadyHiddenError> if already hidden.
   */
  hide(): DomainResult<UTCDateTime> {
    if (this.props.hiddenAtUtc !== null) {
      return left(new FeedbackAlreadyHiddenError(this.id));
    }
    const now = UTCDateTime.now();
    this.props.hiddenAtUtc = now;
    return right(now);
  }

  /**
   * Marks the feedback as reviewed by the professional (analytics only).
   * Idempotent — calling multiple times has no side effect.
   */
  markReviewedByProfessional(): DomainResult<void> {
    if (this.props.reviewedByProfessional) return right(undefined);
    this.props.reviewedByProfessional = true;
    this.props.reviewedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  // ── Query helpers (ADR-0022: methods instead of status enum) ──────────────

  /** True when the feedback has been flagged for moderation. */
  isFlagged(): boolean {
    return this.props.flaggedAtUtc !== null;
  }

  /** True when an admin has hidden this feedback. */
  isHidden(): boolean {
    return this.props.hiddenAtUtc !== null;
  }

  /** True when the feedback is visible (not hidden). */
  isVisible(): boolean {
    return this.props.hiddenAtUtc === null;
  }

  /** True when the rating signals a negative experience (≤ 2 stars). */
  isNegative(): boolean {
    return this.props.rating.isNegative();
  }

  /** True when the rating is neutral (3 stars). */
  isNeutral(): boolean {
    return this.props.rating.isNeutral();
  }

  /** True when the rating signals a positive experience (≥ 4 stars). */
  isPositive(): boolean {
    return this.props.rating.isPositive();
  }

  /** True when the professional has opened and read this feedback. */
  hasBeenReviewed(): boolean {
    return this.props.reviewedByProfessional;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get bookingId(): string {
    return this.props.bookingId;
  }

  get rating(): SessionRating {
    return this.props.rating;
  }

  get comment(): FeedbackComment | null {
    return this.props.comment;
  }

  get sessionDate(): string {
    return this.props.sessionDate;
  }

  get submittedAtUtc(): UTCDateTime {
    return this.props.submittedAtUtc;
  }

  get flaggedAtUtc(): UTCDateTime | null {
    return this.props.flaggedAtUtc;
  }

  get flagReason(): FeedbackFlagReason | null {
    return this.props.flagReason;
  }

  get hiddenAtUtc(): UTCDateTime | null {
    return this.props.hiddenAtUtc;
  }

  get reviewedByProfessional(): boolean {
    return this.props.reviewedByProfessional;
  }

  get reviewedAtUtc(): UTCDateTime | null {
    return this.props.reviewedAtUtc;
  }
}
