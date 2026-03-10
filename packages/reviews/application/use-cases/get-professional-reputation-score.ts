import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type {
  GetProfessionalReputationScoreInputDTO,
  GetProfessionalReputationScoreOutputDTO,
} from '../dtos/get-professional-reputation-score-dto.js';
import type { IProfessionalReputationScoreRepository } from '../projections/i-professional-reputation-score-repository.js';
import { InvalidReviewError } from '../../domain/errors/invalid-review-error.js';

/**
 * GetProfessionalReputationScore use case (read-only).
 *
 * Returns the Bayesian-weighted reputation score for a professional.
 * Returns all-zeros when the professional has no reviews yet.
 */
export class GetProfessionalReputationScore {
  constructor(private readonly reputationRepository: IProfessionalReputationScoreRepository) {}

  async execute(
    dto: GetProfessionalReputationScoreInputDTO,
  ): Promise<DomainResult<GetProfessionalReputationScoreOutputDTO>> {
    if (!dto.professionalProfileId || dto.professionalProfileId.trim().length === 0) {
      return left(new InvalidReviewError('professionalProfileId is required'));
    }

    const reputation = await this.reputationRepository.findByProfessional(
      dto.professionalProfileId,
    );

    if (!reputation) {
      // No reviews yet — return zero DTO
      return right({
        professionalProfileId: dto.professionalProfileId,
        overallScore: 0,
        averageRating: 0,
        totalReviews: 0,
        recommendationRate: 0,
        averageProfessionalism: 0,
        averageCommunication: 0,
        averageTechnicalKnowledge: 0,
        averagePunctuality: 0,
        averageResults: 0,
        lastUpdatedAt: null,
      });
    }

    return right({
      professionalProfileId: reputation.professionalProfileId,
      overallScore: reputation.overallScore.value,
      averageRating: reputation.averageRating,
      totalReviews: reputation.totalReviews,
      recommendationRate: reputation.recommendationRate.value,
      averageProfessionalism: reputation.averageProfessionalism,
      averageCommunication: reputation.averageCommunication,
      averageTechnicalKnowledge: reputation.averageTechnicalKnowledge,
      averagePunctuality: reputation.averagePunctuality,
      averageResults: reputation.averageResults,
      lastUpdatedAt: reputation.lastUpdatedAtUtc?.toISO() ?? null,
    });
  }
}
