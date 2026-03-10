import { AggregateRoot, UTCDateTime, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { Ratings } from '../value-objects/ratings.js';
import type { OverallRating } from '../value-objects/overall-rating.js';
import type { ReviewComment } from '../value-objects/review-comment.js';
import type { ProfessionalResponse } from '../value-objects/professional-response.js';
import type { SessionCount } from '../value-objects/session-count.js';
import type { VerifiedInteraction } from '../value-objects/verified-interaction.js';
import type { FlagReason } from '../value-objects/flag-reason.js';
import { ReviewAlreadyRespondedError } from '../errors/review-already-responded-error.js';
import { ReviewAlreadyFlaggedError } from '../errors/review-already-flagged-error.js';
import { InvalidReviewError } from '../errors/invalid-review-error.js';

export interface ProfessionalReviewProps {
  /**
   * Owning professional — tenant isolation key (ADR-0025). Immutable.
   * Cross-aggregate reference: ID only (ADR-0047).
   */
  professionalProfileId: string;

  /**
   * Client who submitted the review.
   * Cross-aggregate reference: ID only (ADR-0047). Immutable.
   */
  clientId: string;

  /** Five-dimension ratings composite. Immutable after creation. */
  ratings: Ratings;

  /** Arithmetic mean of the 5 ratings, rounded to 1 decimal. Immutable. */
  overallRating: OverallRating;

  /** Whether the client would recommend the professional. Immutable. */
  wouldRecommend: boolean;

  /** Optional client comment (10–1000 chars). Immutable after creation. */
  comment: ReviewComment | null;

  /**
   * Professional's public response to this review. Mutable via respond() /
   * updateResponse(). Null until professional responds.
   */
  professionalResponse: ProfessionalResponse | null;

  /**
   * UTC instant when the professional responded. Updated both on initial
   * respond() and on updateResponse(). Null until first response.
   */
  respondedAtUtc: UTCDateTime | null;

  /** UTC instant when the review was submitted. System-assigned. Immutable. */
  createdAtUtc: UTCDateTime;

  /**
   * UTC instant when the review was flagged for moderation (ADR-0022).
   * Null if not flagged. Using timestamp instead of enum status.
   */
  flaggedAtUtc: UTCDateTime | null;

  /** Reason provided when flagging. Null if not flagged. */
  flagReason: FlagReason | null;

  /**
   * UTC instant when the review was hidden by an admin (ADR-0022).
   * Null if visible. Hidden reviews are soft-deleted — never permanently removed.
   */
  hiddenAtUtc: UTCDateTime | null;

  /**
   * Proof that the client-professional interaction was verified.
   * Always true for persisted reviews — anti-fraud check precedes creation.
   */
  verifiedInteraction: VerifiedInteraction;

  /**
   * Snapshot of the session count at time of review submission.
   * Immutable audit record — enables recomputation of anti-fraud conditions.
   */
  sessionCountAtReview: SessionCount;
}

/**
 * ProfessionalReview aggregate root — an immutable historical record of a
 * client's evaluation of a professional (ADR-0068).
 *
 * ## Immutability
 * Once submitted, the client cannot edit ratings, comment, or wouldRecommend.
 * The review is permanent evidence of the interaction. Admins may hide
 * (soft-delete) a review but never permanently delete it.
 *
 * ## Anti-fraud (ADR-0068 §3)
 * The Application layer (SubmitProfessionalReviewUseCase) verifies ≥5 completed
 * sessions before calling create(). The domain trusts this pre-condition.
 * verifiedInteraction is always true; sessionCountAtReview is an immutable snapshot.
 *
 * ## Timestamp-based state (ADR-0022)
 * State is represented via timestamps (flaggedAtUtc, hiddenAtUtc), NOT enums.
 * Query methods (isFlagged, isHidden, isVisible) read these timestamps.
 *
 * ## Cross-aggregate references (ADR-0047)
 * professionalProfileId and clientId are string IDs — no live object references.
 */
export class ProfessionalReview extends AggregateRoot<ProfessionalReviewProps> {
  private constructor(id: string, props: ProfessionalReviewProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new ProfessionalReview in visible, unflagged state.
   *
   * All pre-conditions (session count ≥5, no duplicate, verified interaction)
   * must be enforced by the Application layer before calling this factory.
   */
  static create(props: {
    id?: string;
    professionalProfileId: string;
    clientId: string;
    ratings: Ratings;
    overallRating: OverallRating;
    wouldRecommend: boolean;
    comment: ReviewComment | null;
    verifiedInteraction: VerifiedInteraction;
    sessionCountAtReview: SessionCount;
    createdAtUtc: UTCDateTime;
  }): DomainResult<ProfessionalReview> {
    if (!props.professionalProfileId || props.professionalProfileId.trim().length === 0) {
      return left(new InvalidReviewError('professionalProfileId is required'));
    }
    if (!props.clientId || props.clientId.trim().length === 0) {
      return left(new InvalidReviewError('clientId is required'));
    }

    const id = props.id ?? generateId();
    const review = new ProfessionalReview(
      id,
      {
        professionalProfileId: props.professionalProfileId,
        clientId: props.clientId,
        ratings: props.ratings,
        overallRating: props.overallRating,
        wouldRecommend: props.wouldRecommend,
        comment: props.comment,
        professionalResponse: null,
        respondedAtUtc: null,
        createdAtUtc: props.createdAtUtc,
        flaggedAtUtc: null,
        flagReason: null,
        hiddenAtUtc: null,
        verifiedInteraction: props.verifiedInteraction,
        sessionCountAtReview: props.sessionCountAtReview,
      },
      0,
    );

    return right(review);
  }

  /** Reconstitutes a review from persistence. */
  static reconstitute(
    id: string,
    props: ProfessionalReviewProps,
    version: number,
  ): ProfessionalReview {
    return new ProfessionalReview(id, props, version);
  }

  // ── Response operations ────────────────────────────────────────────────────

  /**
   * Records the professional's first public response to this review.
   * Returns the respondedAtUtc timestamp on success.
   * Returns Left<ReviewAlreadyRespondedError> if the review already has a
   * response — use updateResponse() to overwrite.
   */
  respond(response: ProfessionalResponse): DomainResult<UTCDateTime> {
    if (this.props.professionalResponse !== null) {
      return left(new ReviewAlreadyRespondedError(this.id));
    }
    const now = UTCDateTime.now();
    this.props.professionalResponse = response;
    this.props.respondedAtUtc = now;
    return right(now);
  }

  /**
   * Overwrites the professional's existing response.
   * Returns the updated respondedAtUtc timestamp on success.
   * Returns Left<InvalidReviewError> if no response exists yet — use respond() first.
   */
  updateResponse(newResponse: ProfessionalResponse): DomainResult<UTCDateTime> {
    if (this.props.professionalResponse === null) {
      return left(
        new InvalidReviewError(
          'cannot update response — no existing response; call respond() first',
        ),
      );
    }
    const now = UTCDateTime.now();
    this.props.professionalResponse = newResponse;
    this.props.respondedAtUtc = now;
    return right(now);
  }

  // ── Moderation operations ─────────────────────────────────────────────────

  /**
   * Flags the review for moderation.
   * Returns the flaggedAtUtc timestamp on success.
   * Returns Left<ReviewAlreadyFlaggedError> if already flagged.
   */
  flag(reason: FlagReason): DomainResult<UTCDateTime> {
    if (this.props.flaggedAtUtc !== null) {
      return left(new ReviewAlreadyFlaggedError(this.id));
    }
    const now = UTCDateTime.now();
    this.props.flaggedAtUtc = now;
    this.props.flagReason = reason;
    return right(now);
  }

  /**
   * Hides the review (admin soft-delete).
   * Returns the hiddenAtUtc timestamp on success.
   * Returns Left<InvalidReviewError> if already hidden.
   */
  hide(): DomainResult<UTCDateTime> {
    if (this.props.hiddenAtUtc !== null) {
      return left(new InvalidReviewError('review is already hidden'));
    }
    const now = UTCDateTime.now();
    this.props.hiddenAtUtc = now;
    return right(now);
  }

  // ── Query helpers (ADR-0022: methods instead of status enum) ──────────────

  /** True when the professional has submitted a response. */
  hasProfessionalResponse(): boolean {
    return this.props.professionalResponse !== null;
  }

  /** True when the review has been flagged for moderation. */
  isFlagged(): boolean {
    return this.props.flaggedAtUtc !== null;
  }

  /** True when an admin has hidden this review. */
  isHidden(): boolean {
    return this.props.hiddenAtUtc !== null;
  }

  /** True when the review is publicly visible (not hidden). */
  isVisible(): boolean {
    return this.props.hiddenAtUtc === null;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get ratings(): Ratings {
    return this.props.ratings;
  }

  get overallRating(): OverallRating {
    return this.props.overallRating;
  }

  get wouldRecommend(): boolean {
    return this.props.wouldRecommend;
  }

  get comment(): ReviewComment | null {
    return this.props.comment;
  }

  get professionalResponse(): ProfessionalResponse | null {
    return this.props.professionalResponse;
  }

  get respondedAtUtc(): UTCDateTime | null {
    return this.props.respondedAtUtc;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get flaggedAtUtc(): UTCDateTime | null {
    return this.props.flaggedAtUtc;
  }

  get flagReason(): FlagReason | null {
    return this.props.flagReason;
  }

  get hiddenAtUtc(): UTCDateTime | null {
    return this.props.hiddenAtUtc;
  }

  get verifiedInteraction(): VerifiedInteraction {
    return this.props.verifiedInteraction;
  }

  get sessionCountAtReview(): SessionCount {
    return this.props.sessionCountAtReview;
  }
}
