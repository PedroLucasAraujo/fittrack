import { UTCDateTime, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type {
  SubmitProfessionalReviewInputDTO,
  SubmitProfessionalReviewOutputDTO,
} from '../dtos/submit-professional-review-dto.js';
import type { IProfessionalReviewRepository } from '../../domain/repositories/i-professional-review-repository.js';
import type { ISessionHistoryQuery } from '../../domain/services/i-session-history-query.js';
import type { IReviewEventPublisher } from '../ports/i-review-event-publisher.js';
import { ProfessionalReview } from '../../domain/aggregates/professional-review.js';
import { Ratings } from '../../domain/value-objects/ratings.js';
import { ReviewComment } from '../../domain/value-objects/review-comment.js';
import { VerifiedInteraction } from '../../domain/value-objects/verified-interaction.js';
import { InsufficientSessionsError } from '../../domain/errors/insufficient-sessions-error.js';
import { DuplicateReviewError } from '../../domain/errors/duplicate-review-error.js';
import { InvalidReviewError } from '../../domain/errors/invalid-review-error.js';
import { ProfessionalReviewSubmittedEvent } from '../../domain/events/professional-review-submitted-event.js';

/**
 * SubmitProfessionalReview use case (ADR-0068 §3).
 *
 * ## Anti-fraud enforcement
 * 1. Client must have ≥5 completed sessions with the professional.
 * 2. Client may not have an existing review unless +20 additional sessions
 *    have occurred since that review (in which case the old review is hidden
 *    and a new one is created).
 *
 * ## Invariants
 * - verifiedInteraction is always true after successful submission.
 * - sessionCountAtReview captures the snapshot at submission time (audit).
 * - Event published post-commit (ADR-0009 §4).
 */
export class SubmitProfessionalReview {
  constructor(
    private readonly reviewRepository: IProfessionalReviewRepository,
    private readonly sessionHistoryQuery: ISessionHistoryQuery,
    private readonly eventPublisher: IReviewEventPublisher,
  ) {}

  async execute(
    dto: SubmitProfessionalReviewInputDTO,
  ): Promise<DomainResult<SubmitProfessionalReviewOutputDTO>> {
    // 1. Validate ratings composite
    const ratingsResult = Ratings.create({
      professionalism: dto.ratings.professionalism,
      communication: dto.ratings.communication,
      technicalKnowledge: dto.ratings.technicalKnowledge,
      punctuality: dto.ratings.punctuality,
      results: dto.ratings.results,
    });
    if (ratingsResult.isLeft()) return left(ratingsResult.value);
    const ratings = ratingsResult.value;

    // 2. Validate optional comment
    let comment: ReviewComment | null = null;
    if (dto.comment !== undefined && dto.comment.trim().length > 0) {
      const commentResult = ReviewComment.create(dto.comment);
      if (commentResult.isLeft()) return left(commentResult.value);
      comment = commentResult.value;
    }

    // 3. Validate IDs are non-empty
    if (!dto.clientId || dto.clientId.trim().length === 0) {
      return left(new InvalidReviewError('clientId is required'));
    }
    if (!dto.professionalProfileId || dto.professionalProfileId.trim().length === 0) {
      return left(new InvalidReviewError('professionalProfileId is required'));
    }

    // 4. Anti-fraud: count completed sessions
    const sessionCountResult = await this.sessionHistoryQuery.countCompletedSessions(
      dto.clientId,
      dto.professionalProfileId,
    );
    if (sessionCountResult.isLeft()) return left(sessionCountResult.value);
    const sessionCount = sessionCountResult.value;

    if (!sessionCount.isEligibleForReview()) {
      return left(new InsufficientSessionsError(sessionCount.value));
    }

    // 5. Check for existing review
    const existingReview = await this.reviewRepository.findByProfessionalAndClient(
      dto.professionalProfileId,
      dto.clientId,
    );

    if (existingReview !== null) {
      // Allow update only if +20 sessions since last review
      if (!sessionCount.isEligibleForUpdate(existingReview.sessionCountAtReview.value)) {
        return left(
          new DuplicateReviewError(
            `need ${20 - (sessionCount.value - existingReview.sessionCountAtReview.value)} more sessions to update review`,
          ),
        );
      }

      // Hide the old review before creating new one
      const hideResult = existingReview.hide();
      /* v8 ignore next */
      if (hideResult.isLeft()) return left(hideResult.value);
      await this.reviewRepository.save(existingReview);
    }

    // 6. Create aggregate
    const overallRating = ratings.calculateOverall();
    const reviewResult = ProfessionalReview.create({
      professionalProfileId: dto.professionalProfileId,
      clientId: dto.clientId,
      ratings,
      overallRating,
      wouldRecommend: dto.wouldRecommend,
      comment,
      verifiedInteraction: VerifiedInteraction.verified(),
      sessionCountAtReview: sessionCount,
      createdAtUtc: UTCDateTime.now(),
    });
    /* v8 ignore next */
    if (reviewResult.isLeft()) return left(reviewResult.value);
    const review = reviewResult.value;

    // 7. Persist
    await this.reviewRepository.save(review);

    // 8. Publish event post-commit (ADR-0009 §4)
    await this.eventPublisher.publishReviewSubmitted(
      new ProfessionalReviewSubmittedEvent(review.id, review.professionalProfileId, {
        reviewId: review.id,
        professionalProfileId: review.professionalProfileId,
        clientId: review.clientId,
        overallRating: review.overallRating.value,
        ratings: review.ratings.toJSON(),
        wouldRecommend: review.wouldRecommend,
        verifiedInteraction: review.verifiedInteraction.isVerified(),
        sessionCountAtReview: review.sessionCountAtReview.value,
        submittedAtUtc: review.createdAtUtc.toISO(),
      }),
    );

    return right({
      reviewId: review.id,
      professionalProfileId: review.professionalProfileId,
      clientId: review.clientId,
      overallRating: review.overallRating.value,
      sessionCountAtReview: review.sessionCountAtReview.value,
      createdAtUtc: review.createdAtUtc.toISO(),
    });
  }
}
