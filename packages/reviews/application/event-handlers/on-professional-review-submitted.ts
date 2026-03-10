import type { ProfessionalReviewSubmittedPayload } from '../../domain/events/professional-review-submitted-event.js';
import type { IProfessionalReputationScoreRepository } from '../projections/i-professional-reputation-score-repository.js';
import { ProfessionalReputationScore } from '../projections/professional-reputation-score.js';

/**
 * Handles ProfessionalReviewSubmitted events.
 *
 * ## Responsibility
 * When a verified review is submitted, increments the professional's
 * ProfessionalReputationScore read model using incremental sums for O(1) updates.
 * Applies the Bayesian weighted score formula (ADR-0068 §4).
 *
 * ## Bounded context isolation (ADR-0005)
 * Receives payload as a plain DTO — does NOT import from other bounded contexts.
 *
 * ## Eventual consistency (ADR-0016)
 * The read model is updated asynchronously after the review is persisted.
 * A brief window of inconsistency between review count and score is acceptable.
 */
export class OnProfessionalReviewSubmitted {
  constructor(private readonly reputationRepository: IProfessionalReputationScoreRepository) {}

  async handle(payload: ProfessionalReviewSubmittedPayload): Promise<void> {
    // 1. Find or create reputation score for this professional
    let reputation = await this.reputationRepository.findByProfessional(
      payload.professionalProfileId,
    );

    if (!reputation) {
      reputation = ProfessionalReputationScore.createEmpty(payload.professionalProfileId);
    }

    // 2. Add review values — recalculates averages and Bayesian score internally
    reputation.addReview({
      professionalism: payload.ratings.professionalism,
      communication: payload.ratings.communication,
      technicalKnowledge: payload.ratings.technicalKnowledge,
      punctuality: payload.ratings.punctuality,
      results: payload.ratings.results,
      overallRating: payload.overallRating,
      wouldRecommend: payload.wouldRecommend,
    });

    // 3. Persist the updated projection
    await this.reputationRepository.save(reputation);
  }
}
