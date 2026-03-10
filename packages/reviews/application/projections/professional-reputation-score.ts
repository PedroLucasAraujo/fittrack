import { UTCDateTime } from '@fittrack/core';
import { ReputationScore } from '../../domain/value-objects/reputation-score.js';
import { RecommendationRate } from '../../domain/value-objects/recommendation-rate.js';

/**
 * Platform-wide Bayesian prior configuration.
 * Can be externalised to configuration later.
 */
const PLATFORM_AVERAGE = 4.2;
const MINIMUM_REVIEWS_THRESHOLD = 20;

export interface ProfessionalReputationScoreProps {
  professionalProfileId: string;
  overallScore: ReputationScore;
  averageRating: number;
  totalReviews: number;
  verifiedReviews: number;
  wouldRecommendCount: number;
  averageProfessionalism: number;
  averageCommunication: number;
  averageTechnicalKnowledge: number;
  averagePunctuality: number;
  averageResults: number;
  recommendationRate: RecommendationRate;
  /** Incremental sums — maintain for O(1) average recalculation. */
  sumProfessionalism: number;
  sumCommunication: number;
  sumTechnicalKnowledge: number;
  sumPunctuality: number;
  sumResults: number;
  sumOverallRating: number;
  /** UTC instant of last score update (ADR-0010). Null until first review is added. */
  lastUpdatedAtUtc: UTCDateTime | null;
}

/**
 * Read model (projection) — NOT an aggregate.
 *
 * ProfessionalReputationScore is updated asynchronously by event handlers
 * (OnProfessionalReviewSubmitted, OnProfessionalReviewHidden) and
 * serves as a denormalised read-optimised view of a professional's reputation
 * (ADR-0068 §4, ADR-0016 eventual consistency).
 *
 * Incremental sums enable O(1) average recalculation on each update
 * without re-scanning all reviews.
 */
export class ProfessionalReputationScore {
  private props: ProfessionalReputationScoreProps;

  private constructor(props: ProfessionalReputationScoreProps) {
    this.props = props;
  }

  /** Creates an empty reputation score for a professional who has no reviews yet. */
  static createEmpty(professionalProfileId: string): ProfessionalReputationScore {
    return new ProfessionalReputationScore({
      professionalProfileId,
      overallScore: ReputationScore.zero(),
      averageRating: 0,
      totalReviews: 0,
      verifiedReviews: 0,
      wouldRecommendCount: 0,
      averageProfessionalism: 0,
      averageCommunication: 0,
      averageTechnicalKnowledge: 0,
      averagePunctuality: 0,
      averageResults: 0,
      recommendationRate: RecommendationRate.zero(),
      sumProfessionalism: 0,
      sumCommunication: 0,
      sumTechnicalKnowledge: 0,
      sumPunctuality: 0,
      sumResults: 0,
      sumOverallRating: 0,
      lastUpdatedAtUtc: null,
    });
  }

  /** Reconstitutes from persistence. */
  static reconstitute(props: ProfessionalReputationScoreProps): ProfessionalReputationScore {
    return new ProfessionalReputationScore(props);
  }

  /**
   * Exposes internal props for infrastructure serialisation.
   * Do not use outside of repository implementations.
   */
  toProps(): ProfessionalReputationScoreProps {
    return this.props;
  }

  /**
   * Adds a new review's values to this reputation score.
   * Recalculates averages and Bayesian score.
   */
  addReview(review: {
    professionalism: number;
    communication: number;
    technicalKnowledge: number;
    punctuality: number;
    results: number;
    overallRating: number;
    wouldRecommend: boolean;
  }): void {
    this.props.sumProfessionalism += review.professionalism;
    this.props.sumCommunication += review.communication;
    this.props.sumTechnicalKnowledge += review.technicalKnowledge;
    this.props.sumPunctuality += review.punctuality;
    this.props.sumResults += review.results;
    this.props.sumOverallRating += review.overallRating;
    this.props.totalReviews += 1;
    this.props.verifiedReviews += 1;

    if (review.wouldRecommend) {
      this.props.wouldRecommendCount += 1;
    }

    this._recalculate();
  }

  /**
   * Removes a hidden review's values from this reputation score.
   * Recalculates averages and Bayesian score.
   */
  removeReview(review: {
    professionalism: number;
    communication: number;
    technicalKnowledge: number;
    punctuality: number;
    results: number;
    overallRating: number;
    wouldRecommend: boolean;
  }): void {
    this.props.sumProfessionalism -= review.professionalism;
    this.props.sumCommunication -= review.communication;
    this.props.sumTechnicalKnowledge -= review.technicalKnowledge;
    this.props.sumPunctuality -= review.punctuality;
    this.props.sumResults -= review.results;
    this.props.sumOverallRating -= review.overallRating;
    this.props.totalReviews = Math.max(0, this.props.totalReviews - 1);
    this.props.verifiedReviews = Math.max(0, this.props.verifiedReviews - 1);

    if (review.wouldRecommend) {
      this.props.wouldRecommendCount = Math.max(0, this.props.wouldRecommendCount - 1);
    }

    this._recalculate();
  }

  private _recalculate(): void {
    const n = this.props.totalReviews;

    if (n === 0) {
      this.props.averageRating = 0;
      this.props.averageProfessionalism = 0;
      this.props.averageCommunication = 0;
      this.props.averageTechnicalKnowledge = 0;
      this.props.averagePunctuality = 0;
      this.props.averageResults = 0;
      this.props.overallScore = ReputationScore.zero();
      this.props.recommendationRate = RecommendationRate.zero();
    } else {
      this.props.averageProfessionalism = this.props.sumProfessionalism / n;
      this.props.averageCommunication = this.props.sumCommunication / n;
      this.props.averageTechnicalKnowledge = this.props.sumTechnicalKnowledge / n;
      this.props.averagePunctuality = this.props.sumPunctuality / n;
      this.props.averageResults = this.props.sumResults / n;
      this.props.averageRating = this.props.sumOverallRating / n;
      this.props.overallScore = ReputationScore.calculateBayesian(
        n,
        this.props.averageRating,
        PLATFORM_AVERAGE,
        MINIMUM_REVIEWS_THRESHOLD,
      );
      this.props.recommendationRate = RecommendationRate.calculate(
        this.props.wouldRecommendCount,
        n,
      );
    }

    this.props.lastUpdatedAtUtc = UTCDateTime.now();
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get overallScore(): ReputationScore {
    return this.props.overallScore;
  }

  get averageRating(): number {
    return this.props.averageRating;
  }

  get totalReviews(): number {
    return this.props.totalReviews;
  }

  get wouldRecommendCount(): number {
    return this.props.wouldRecommendCount;
  }

  get recommendationRate(): RecommendationRate {
    return this.props.recommendationRate;
  }

  get averageProfessionalism(): number {
    return this.props.averageProfessionalism;
  }

  get averageCommunication(): number {
    return this.props.averageCommunication;
  }

  get averageTechnicalKnowledge(): number {
    return this.props.averageTechnicalKnowledge;
  }

  get averagePunctuality(): number {
    return this.props.averagePunctuality;
  }

  get averageResults(): number {
    return this.props.averageResults;
  }

  get lastUpdatedAtUtc(): UTCDateTime | null {
    return this.props.lastUpdatedAtUtc;
  }
}
