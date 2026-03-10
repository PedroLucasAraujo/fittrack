import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type {
  GetClientReviewsInputDTO,
  GetClientReviewsOutputDTO,
  ClientReviewItemDTO,
} from '../dtos/get-client-reviews-dto.js';
import type { IProfessionalReviewRepository } from '../../domain/repositories/i-professional-review-repository.js';
import { InvalidReviewError } from '../../domain/errors/invalid-review-error.js';

/**
 * GetClientReviews use case (read-only).
 *
 * Returns all visible reviews submitted by a client.
 * Used by the client to see their own review history.
 */
export class GetClientReviews {
  constructor(private readonly reviewRepository: IProfessionalReviewRepository) {}

  async execute(dto: GetClientReviewsInputDTO): Promise<DomainResult<GetClientReviewsOutputDTO>> {
    if (!dto.clientId || dto.clientId.trim().length === 0) {
      return left(new InvalidReviewError('clientId is required'));
    }

    const reviews = await this.reviewRepository.findByClient(dto.clientId);

    // Filter to only visible reviews (client should not see hidden reviews)
    const visibleReviews = reviews.filter((r) => r.isVisible());

    const sorted = [...visibleReviews].sort(
      (a, b) => b.createdAtUtc.value.getTime() - a.createdAtUtc.value.getTime(),
    );

    const items: ClientReviewItemDTO[] = sorted.map((r) => ({
      reviewId: r.id,
      professionalProfileId: r.professionalProfileId,
      overallRating: r.overallRating.value,
      wouldRecommend: r.wouldRecommend,
      comment: r.comment?.value ?? null,
      createdAtUtc: r.createdAtUtc.toISO(),
      sessionCountAtReview: r.sessionCountAtReview.value,
    }));

    return right({
      clientId: dto.clientId,
      reviews: items,
      total: items.length,
    });
  }
}
