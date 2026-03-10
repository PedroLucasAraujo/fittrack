/**
 * Bayesian-weighted reputation score for a professional (ADR-0068 §4).
 *
 * Prevents score inflation when a professional has very few reviews.
 *
 * Formula:
 *   score = (v / (v + m)) * R + (m / (v + m)) * C
 *
 * Where:
 *   v = totalReviews (number of verified reviews)
 *   m = minimumReviewsThreshold (e.g. 20) — controls convergence speed
 *   R = averageRating (arithmetic mean of reviews)
 *   C = platformAverage (global platform mean, e.g. 4.2)
 *
 * Examples:
 *   Profissional A: 2 reviews, avg 5.0, C=4.2, m=20 → (2/22)*5.0 + (20/22)*4.2 ≈ 4.25
 *   Profissional B: 50 reviews, avg 4.8, C=4.2, m=20 → (50/70)*4.8 + (20/70)*4.2 ≈ 4.63
 */
export class ReputationScore {
  private constructor(readonly value: number) {}

  /**
   * Calculates the Bayesian-weighted reputation score.
   * The result is clamped to [1.0, 5.0] and rounded to 2 decimal places.
   *
   * @param totalReviews              Number of verified, visible reviews
   * @param averageRating             Arithmetic mean of all visible review ratings
   * @param platformAverage           Global platform mean (prior)
   * @param minimumReviewsThreshold   Controls convergence speed (default 20)
   */
  static calculateBayesian(
    totalReviews: number,
    averageRating: number,
    platformAverage: number,
    minimumReviewsThreshold: number = 20,
  ): ReputationScore {
    if (totalReviews === 0) {
      return new ReputationScore(0);
    }

    const v = totalReviews;
    const m = minimumReviewsThreshold;
    const R = averageRating;
    const C = platformAverage;

    const raw = (v / (v + m)) * R + (m / (v + m)) * C;
    const clamped = Math.min(5.0, Math.max(1.0, raw));
    const rounded = Math.round(clamped * 100) / 100;

    return new ReputationScore(rounded);
  }

  /** Creates a zero score (professional has no reviews yet). */
  static zero(): ReputationScore {
    return new ReputationScore(0);
  }

  equals(other: ReputationScore): boolean {
    return this.value === other.value;
  }
}
