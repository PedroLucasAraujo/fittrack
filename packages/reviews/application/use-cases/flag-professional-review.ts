import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type {
  FlagProfessionalReviewInputDTO,
  FlagProfessionalReviewOutputDTO,
} from '../dtos/flag-professional-review-dto.js';
import type { IProfessionalReviewRepository } from '../../domain/repositories/i-professional-review-repository.js';
import type { IReviewEventPublisher } from '../ports/i-review-event-publisher.js';
import { FlagReason } from '../../domain/value-objects/flag-reason.js';
import { ReviewNotFoundError } from '../../domain/errors/review-not-found-error.js';
import { UnauthorizedReviewActionError } from '../../domain/errors/unauthorized-review-action-error.js';
import { ProfessionalReviewFlaggedEvent } from '../../domain/events/professional-review-flagged-event.js';

/**
 * FlagProfessionalReview use case.
 *
 * Only the reviewed professional or a platform admin may flag a review.
 * Flagged reviews remain visible until a moderator hides them.
 */
export class FlagProfessionalReview {
  constructor(
    private readonly reviewRepository: IProfessionalReviewRepository,
    private readonly eventPublisher: IReviewEventPublisher,
  ) {}

  async execute(
    dto: FlagProfessionalReviewInputDTO,
  ): Promise<DomainResult<FlagProfessionalReviewOutputDTO>> {
    // 1. Validate reason
    const reasonResult = FlagReason.create(dto.reason);
    if (reasonResult.isLeft()) return left(reasonResult.value);
    const reason = reasonResult.value;

    // 2. Load review
    const review = await this.reviewRepository.findById(dto.reviewId);
    if (!review) {
      return left(new ReviewNotFoundError(dto.reviewId));
    }

    // 3. Authorization: flaggedBy must be provided (non-empty).
    // The API layer is responsible for ensuring that only the reviewed professional
    // or a platform admin can call this use case.
    if (!dto.flaggedBy || dto.flaggedBy.trim().length === 0) {
      return left(new UnauthorizedReviewActionError('flaggedBy is required'));
    }

    // 4. Flag — returns Left<ReviewAlreadyFlaggedError> if already flagged,
    // or Right<UTCDateTime> with the flaggedAtUtc timestamp on success.
    const flagResult = review.flag(reason);
    if (flagResult.isLeft()) return left(flagResult.value);
    const flaggedAtIso = flagResult.value.toISO();

    // 5. Persist
    await this.reviewRepository.save(review);

    // 6. Publish event post-commit
    await this.eventPublisher.publishReviewFlagged(
      new ProfessionalReviewFlaggedEvent(review.id, review.professionalProfileId, {
        reviewId: review.id,
        professionalProfileId: review.professionalProfileId,
        flaggedBy: dto.flaggedBy,
        reason: reason.value,
        flaggedAtUtc: flaggedAtIso,
      }),
    );

    return right({
      reviewId: review.id,
      flaggedAtUtc: flaggedAtIso,
    });
  }
}
