import { describe, it, expect } from 'vitest';
import { Rating } from '../../../domain/value-objects/rating.js';
import { ReviewErrorCodes } from '../../../domain/errors/review-error-codes.js';

describe('Rating', () => {
  describe('create()', () => {
    it.each([1, 2, 3, 4, 5])('creates a valid rating for value %i', (value) => {
      const result = Rating.create(value);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe(value);
      }
    });

    it.each([0, 6, -1, 10])(
      'returns Left<InvalidRatingError> for out-of-range value %i',
      (value) => {
        const result = Rating.create(value);
        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
          expect(result.value.code).toBe(ReviewErrorCodes.INVALID_RATING);
        }
      },
    );

    it.each([1.5, 3.7, 4.9])(
      'returns Left<InvalidRatingError> for non-integer value %f',
      (value) => {
        const result = Rating.create(value);
        expect(result.isLeft()).toBe(true);
      },
    );
  });

  describe('toNumber()', () => {
    it('returns the numeric value', () => {
      const rating = Rating.create(4);
      if (rating.isRight()) {
        expect(rating.value.toNumber()).toBe(4);
      }
    });
  });

  describe('equals()', () => {
    it('returns true for same value', () => {
      const a = Rating.create(3).value as Rating;
      const b = Rating.create(3).value as Rating;
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different values', () => {
      const a = Rating.create(3).value as Rating;
      const b = Rating.create(4).value as Rating;
      expect(a.equals(b)).toBe(false);
    });
  });
});
