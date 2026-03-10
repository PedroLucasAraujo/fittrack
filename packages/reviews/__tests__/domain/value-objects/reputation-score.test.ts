import { describe, it, expect } from 'vitest';
import { ReputationScore } from '../../../domain/value-objects/reputation-score.js';

describe('ReputationScore', () => {
  describe('calculateBayesian()', () => {
    it('returns 0 when totalReviews is 0', () => {
      const score = ReputationScore.calculateBayesian(0, 0, 4.2, 20);
      expect(score.value).toBe(0);
    });

    it('calculates correctly for 2 reviews with avg 5.0 (low-volume scenario)', () => {
      // (2/22)*5.0 + (20/22)*4.2 = 0.4545...+ 3.8181... = 4.2727... ≈ 4.27
      const score = ReputationScore.calculateBayesian(2, 5.0, 4.2, 20);
      expect(score.value).toBeCloseTo(4.27, 1);
    });

    it('calculates correctly for 50 reviews with avg 4.8 (high-volume scenario)', () => {
      // (50/70)*4.8 + (20/70)*4.2 = 3.4285... + 1.2 = 4.6285... ≈ 4.63
      const score = ReputationScore.calculateBayesian(50, 4.8, 4.2, 20);
      expect(score.value).toBeCloseTo(4.63, 1);
    });

    it('high-volume professional B has higher score than low-volume professional A even with lower avg', () => {
      const profA = ReputationScore.calculateBayesian(2, 5.0, 4.2, 20);
      const profB = ReputationScore.calculateBayesian(50, 4.8, 4.2, 20);
      expect(profB.value).toBeGreaterThan(profA.value);
    });

    it('clamps score to minimum 1.0', () => {
      const score = ReputationScore.calculateBayesian(1, 1.0, 1.0, 20);
      expect(score.value).toBeGreaterThanOrEqual(1.0);
    });

    it('clamps score to maximum 5.0', () => {
      const score = ReputationScore.calculateBayesian(1000, 5.0, 5.0, 20);
      expect(score.value).toBeLessThanOrEqual(5.0);
    });

    it('converges to averageRating when totalReviews is very large', () => {
      const score = ReputationScore.calculateBayesian(10000, 4.5, 4.2, 20);
      expect(score.value).toBeCloseTo(4.5, 1);
    });

    it('converges to platformAverage when totalReviews is 1', () => {
      // With only 1 review the score should be close to the platform average
      const score = ReputationScore.calculateBayesian(1, 5.0, 4.0, 20);
      // (1/21)*5.0 + (20/21)*4.0 ≈ 4.048
      expect(score.value).toBeCloseTo(4.05, 1);
    });
  });

  describe('zero()', () => {
    it('returns a score of 0', () => {
      const score = ReputationScore.zero();
      expect(score.value).toBe(0);
    });
  });

  describe('equals()', () => {
    it('returns true for same value', () => {
      const a = ReputationScore.zero();
      const b = ReputationScore.zero();
      expect(a.equals(b)).toBe(true);
    });
  });
});
