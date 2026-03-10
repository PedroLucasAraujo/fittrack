/**
 * The percentage of reviewers who would recommend the professional.
 * Range: [0.0, 100.0], rounded to 1 decimal place.
 */
export class RecommendationRate {
  private constructor(readonly value: number) {}

  /**
   * Calculates the recommendation rate from counts.
   * Returns 0 when totalReviews is 0 (avoid division by zero).
   *
   * @param wouldRecommendCount  Number of reviews where client said "yes"
   * @param totalReviews         Total number of visible reviews
   */
  static calculate(wouldRecommendCount: number, totalReviews: number): RecommendationRate {
    if (totalReviews === 0) {
      return new RecommendationRate(0);
    }
    const raw = (wouldRecommendCount / totalReviews) * 100;
    const rounded = Math.round(raw * 10) / 10;
    return new RecommendationRate(Math.min(100.0, Math.max(0.0, rounded)));
  }

  /** Creates a zero recommendation rate (no reviews yet). */
  static zero(): RecommendationRate {
    return new RecommendationRate(0);
  }

  equals(other: RecommendationRate): boolean {
    return this.value === other.value;
  }
}
