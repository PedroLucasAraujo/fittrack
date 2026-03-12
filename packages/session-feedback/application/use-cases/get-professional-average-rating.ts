import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidFeedbackError } from '../../domain/errors/invalid-feedback-error.js';
import type { ISessionFeedbackRepository } from '../../domain/repositories/i-session-feedback-repository.js';
import type {
  GetProfessionalAverageRatingInputDTO,
  GetProfessionalAverageRatingOutputDTO,
} from '../dtos/get-professional-average-rating-dto.js';

/**
 * Returns the average session feedback rating for a professional (ADR-0057).
 *
 * Hidden feedbacks are always excluded from the calculation.
 * When windowDays is undefined, the all-time average is returned.
 */
export class GetProfessionalAverageRating {
  constructor(private readonly feedbackRepo: ISessionFeedbackRepository) {}

  async execute(
    dto: GetProfessionalAverageRatingInputDTO,
  ): Promise<DomainResult<GetProfessionalAverageRatingOutputDTO>> {
    if (!dto.professionalProfileId || dto.professionalProfileId.trim().length === 0) {
      return left(new InvalidFeedbackError('professionalProfileId is required'));
    }

    const averageRating = await this.feedbackRepo.getAverageRating(
      dto.professionalProfileId,
      dto.windowDays,
    );

    // Count visible feedbacks (optionally filtered by window)
    let feedbacks = await this.feedbackRepo.findByProfessionalId(
      dto.professionalProfileId,
      false, // exclude hidden
    );

    if (dto.windowDays !== undefined && dto.windowDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - dto.windowDays);
      feedbacks = feedbacks.filter((f) => new Date(f.submittedAtUtc.toISO()) >= cutoff);
    }

    return right({
      professionalProfileId: dto.professionalProfileId,
      averageRating,
      totalFeedbacks: feedbacks.length,
      windowDays: dto.windowDays ?? null,
    });
  }
}
