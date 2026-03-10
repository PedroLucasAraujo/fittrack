import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type {
  HideProfessionalReviewInputDTO,
  HideProfessionalReviewOutputDTO,
} from '../dtos/hide-professional-review-dto.js';
import type { IProfessionalReviewRepository } from '../../domain/repositories/i-professional-review-repository.js';
import type { IReviewEventPublisher } from '../ports/i-review-event-publisher.js';
import { ReviewNotFoundError } from '../../domain/errors/review-not-found-error.js';
import { UnauthorizedReviewActionError } from '../../domain/errors/unauthorized-review-action-error.js';
import { ProfessionalReviewHiddenEvent } from '../../domain/events/professional-review-hidden-event.js';

/**
 * HideProfessionalReview use case (admin-only).
 *
 * Soft-deletes a review by setting hiddenAtUtc. Never permanently deletes.
 * After hiding, the OnProfessionalReviewHidden event handler recalculates
 * the professional's reputation score (eventual consistency — ADR-0016).
 *
 * Authorization: hiddenBy must be a valid admin ID. The API layer is
 * responsible for validating admin identity before calling this use case.
 * The use case accepts isAdmin flag to enforce the invariant.
 */
export class HideProfessionalReview {
  constructor(
    private readonly reviewRepository: IProfessionalReviewRepository,
    private readonly eventPublisher: IReviewEventPublisher,
  ) {}

  async execute(
    dto: HideProfessionalReviewInputDTO & { isAdmin: boolean },
  ): Promise<DomainResult<HideProfessionalReviewOutputDTO>> {
    // 1. Admin gate
    if (!dto.isAdmin) {
      return left(new UnauthorizedReviewActionError('only platform admins may hide reviews'));
    }

    // 2. Load review
    const review = await this.reviewRepository.findById(dto.reviewId);
    if (!review) {
      return left(new ReviewNotFoundError(dto.reviewId));
    }

    // 3. Hide — returns Left<InvalidReviewError> if already hidden,
    // or Right<UTCDateTime> with the hiddenAtUtc timestamp on success.
    const hideResult = review.hide();
    if (hideResult.isLeft()) return left(hideResult.value);
    const hiddenAtIso = hideResult.value.toISO();

    // 4. Persist
    await this.reviewRepository.save(review);

    // 5. Publish event post-commit (triggers reputation recalculation)
    await this.eventPublisher.publishReviewHidden(
      new ProfessionalReviewHiddenEvent(review.id, review.professionalProfileId, {
        reviewId: review.id,
        professionalProfileId: review.professionalProfileId,
        hiddenBy: dto.hiddenBy,
        overallRating: review.overallRating.value,
        ratings: review.ratings.toJSON(),
        wouldRecommend: review.wouldRecommend,
        hiddenAtUtc: hiddenAtIso,
      }),
    );

    return right({
      reviewId: review.id,
      hiddenAtUtc: hiddenAtIso,
    });
  }
}
