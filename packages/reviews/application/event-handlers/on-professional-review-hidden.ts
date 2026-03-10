import type { ProfessionalReviewHiddenPayload } from '../../domain/events/professional-review-hidden-event.js';
import type { IProfessionalReputationScoreRepository } from '../projections/i-professional-reputation-score-repository.js';

/**
 * Handles ProfessionalReviewHidden events.
 *
 * ## Responsibility
 * When an admin hides a review, subtracts that review's contribution from
 * the professional's ProfessionalReputationScore read model and recalculates
 * the Bayesian score.
 *
 * ## Eventual consistency (ADR-0016)
 * The reputation score may briefly reflect the hidden review until this
 * handler completes. This is acceptable under the eventual consistency policy.
 */
export class OnProfessionalReviewHidden {
  constructor(private readonly reputationRepository: IProfessionalReputationScoreRepository) {}

  async handle(payload: ProfessionalReviewHiddenPayload): Promise<void> {
    const reputation = await this.reputationRepository.findByProfessional(
      payload.professionalProfileId,
    );

    // Guard: if no reputation record exists there is nothing to subtract
    if (!reputation || reputation.totalReviews === 0) {
      return;
    }

    // Remove review values — recalculates averages and Bayesian score internally
    reputation.removeReview({
      professionalism: payload.ratings.professionalism,
      communication: payload.ratings.communication,
      technicalKnowledge: payload.ratings.technicalKnowledge,
      punctuality: payload.ratings.punctuality,
      results: payload.ratings.results,
      overallRating: payload.overallRating,
      wouldRecommend: payload.wouldRecommend,
    });

    await this.reputationRepository.save(reputation);
  }
}
