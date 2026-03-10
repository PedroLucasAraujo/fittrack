import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type {
  GetProfessionalReviewsInputDTO,
  GetProfessionalReviewsOutputDTO,
  ProfessionalReviewItemDTO,
} from '../dtos/get-professional-reviews-dto.js';
import type { IProfessionalReviewRepository } from '../../domain/repositories/i-professional-review-repository.js';
import type { ProfessionalReview } from '../../domain/aggregates/professional-review.js';
import { InvalidReviewError } from '../../domain/errors/invalid-review-error.js';

/**
 * GetProfessionalReviews use case (read-only).
 *
 * By default returns only visible reviews (hiddenAtUtc = null).
 * includeHidden=true is reserved for admin usage — authorization
 * must be enforced by the API layer before setting this flag.
 *
 * Clients are anonymised as "Verified Client" (privacy — ADR-0037).
 */
export class GetProfessionalReviews {
  constructor(private readonly reviewRepository: IProfessionalReviewRepository) {}

  async execute(
    dto: GetProfessionalReviewsInputDTO,
  ): Promise<DomainResult<GetProfessionalReviewsOutputDTO>> {
    if (!dto.professionalProfileId || dto.professionalProfileId.trim().length === 0) {
      return left(new InvalidReviewError('professionalProfileId is required'));
    }

    const reviews: ProfessionalReview[] = dto.includeHidden
      ? await this.reviewRepository.findByProfessional(dto.professionalProfileId)
      : await this.reviewRepository.findVisibleByProfessional(dto.professionalProfileId);

    // Sort newest first
    const sorted = [...reviews].sort(
      (a, b) => b.createdAtUtc.value.getTime() - a.createdAtUtc.value.getTime(),
    );

    const items: ProfessionalReviewItemDTO[] = sorted.map((r) => ({
      reviewId: r.id,
      clientLabel: 'Verified Client',
      ratings: r.ratings.toJSON(),
      overallRating: r.overallRating.value,
      wouldRecommend: r.wouldRecommend,
      comment: r.comment?.value ?? null,
      professionalResponse: r.professionalResponse?.value ?? null,
      respondedAtUtc: r.respondedAtUtc?.toISO() ?? null,
      createdAtUtc: r.createdAtUtc.toISO(),
      sessionCountAtReview: r.sessionCountAtReview.value,
      isFlagged: r.isFlagged(),
      isHidden: r.isHidden(),
    }));

    return right({
      professionalProfileId: dto.professionalProfileId,
      reviews: items,
      total: items.length,
    });
  }
}
