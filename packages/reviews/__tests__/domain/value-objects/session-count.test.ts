import { describe, it, expect } from 'vitest';
import { SessionCount } from '../../../domain/value-objects/session-count.js';
import { ReviewErrorCodes } from '../../../domain/errors/review-error-codes.js';

describe('SessionCount', () => {
  describe('create()', () => {
    it.each([0, 1, 5, 20, 100])('creates a valid session count for %i', (count) => {
      const result = SessionCount.create(count);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe(count);
      }
    });

    it('returns Left<InvalidReviewError> for negative count', () => {
      const result = SessionCount.create(-1);
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ReviewErrorCodes.INVALID_REVIEW);
      }
    });

    it('returns Left<InvalidReviewError> for non-integer count', () => {
      const result = SessionCount.create(3.5);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('isEligibleForReview()', () => {
    it('returns false for 4 sessions', () => {
      const count = SessionCount.create(4).value as SessionCount;
      expect(count.isEligibleForReview()).toBe(false);
    });

    it('returns true for exactly 5 sessions', () => {
      const count = SessionCount.create(5).value as SessionCount;
      expect(count.isEligibleForReview()).toBe(true);
    });

    it('returns true for 10 sessions', () => {
      const count = SessionCount.create(10).value as SessionCount;
      expect(count.isEligibleForReview()).toBe(true);
    });
  });

  describe('isEligibleForUpdate()', () => {
    it('returns false when fewer than 20 additional sessions since last review', () => {
      const count = SessionCount.create(24).value as SessionCount;
      expect(count.isEligibleForUpdate(10)).toBe(false); // 24 - 10 = 14 < 20
    });

    it('returns true when exactly 20 additional sessions since last review', () => {
      const count = SessionCount.create(30).value as SessionCount;
      expect(count.isEligibleForUpdate(10)).toBe(true); // 30 - 10 = 20 >= 20
    });

    it('returns true when more than 20 additional sessions', () => {
      const count = SessionCount.create(50).value as SessionCount;
      expect(count.isEligibleForUpdate(10)).toBe(true); // 50 - 10 = 40 >= 20
    });
  });

  describe('equals()', () => {
    it('returns true for same count', () => {
      const a = SessionCount.create(10).value as SessionCount;
      const b = SessionCount.create(10).value as SessionCount;
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different counts', () => {
      const a = SessionCount.create(10).value as SessionCount;
      const b = SessionCount.create(20).value as SessionCount;
      expect(a.equals(b)).toBe(false);
    });
  });
});
