import { describe, it, expect } from 'vitest';
import { Ratings } from '../../../domain/value-objects/ratings.js';
import { ReviewErrorCodes } from '../../../domain/errors/review-error-codes.js';

describe('Ratings', () => {
  const validProps = {
    professionalism: 4,
    communication: 5,
    technicalKnowledge: 3,
    punctuality: 4,
    results: 5,
  };

  describe('create()', () => {
    it('creates a valid Ratings VO with all 5 criteria', () => {
      const result = Ratings.create(validProps);
      expect(result.isRight()).toBe(true);
    });

    it('returns Left<InvalidRatingError> if professionalism is invalid', () => {
      const result = Ratings.create({ ...validProps, professionalism: 6 });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ReviewErrorCodes.INVALID_RATING);
      }
    });

    it('returns Left<InvalidRatingError> if communication is invalid', () => {
      const result = Ratings.create({ ...validProps, communication: 0 });
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left<InvalidRatingError> if technicalKnowledge is invalid', () => {
      const result = Ratings.create({ ...validProps, technicalKnowledge: -1 });
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left<InvalidRatingError> if punctuality is invalid', () => {
      const result = Ratings.create({ ...validProps, punctuality: 3.5 });
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left<InvalidRatingError> if results is invalid', () => {
      const result = Ratings.create({ ...validProps, results: 10 });
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('calculateOverall()', () => {
    it('returns arithmetic mean of 5 ratings rounded to 1 decimal', () => {
      // (4+5+3+4+5)/5 = 21/5 = 4.2
      const ratings = Ratings.create(validProps).value as Ratings;
      const overall = ratings.calculateOverall();
      expect(overall.value).toBe(4.2);
    });

    it('calculates correctly for uniform ratings', () => {
      // (5+5+5+5+5)/5 = 5.0
      const ratings = Ratings.create({
        professionalism: 5,
        communication: 5,
        technicalKnowledge: 5,
        punctuality: 5,
        results: 5,
      }).value as Ratings;
      expect(ratings.calculateOverall().value).toBe(5.0);
    });

    it('rounds to 1 decimal place', () => {
      // (1+2+3+4+5)/5 = 3.0
      const ratings = Ratings.create({
        professionalism: 1,
        communication: 2,
        technicalKnowledge: 3,
        punctuality: 4,
        results: 5,
      }).value as Ratings;
      expect(ratings.calculateOverall().value).toBe(3.0);
    });
  });

  describe('toJSON()', () => {
    it('returns plain object with all criterion values', () => {
      const ratings = Ratings.create(validProps).value as Ratings;
      expect(ratings.toJSON()).toEqual(validProps);
    });
  });
});
