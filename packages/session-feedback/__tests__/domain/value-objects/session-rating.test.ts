import { describe, it, expect } from 'vitest';
import { SessionRating } from '../../../domain/value-objects/session-rating.js';

describe('SessionRating', () => {
  describe('create()', () => {
    it.each([1, 2, 3, 4, 5])('accepts valid rating %i', (value) => {
      const result = SessionRating.create(value);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.toNumber()).toBe(value);
      }
    });

    it.each([0, 6, -1, 100])('rejects out-of-range value %i', (value) => {
      const result = SessionRating.create(value);
      expect(result.isLeft()).toBe(true);
    });

    it.each([1.5, 2.9, 3.1])('rejects non-integer value %f', (value) => {
      const result = SessionRating.create(value);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects NaN', () => {
      const result = SessionRating.create(NaN);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('isNegative()', () => {
    it('returns true for rating 1', () => {
      const rating = SessionRating.create(1).value as SessionRating;
      expect(rating.isNegative()).toBe(true);
    });

    it('returns true for rating 2', () => {
      const rating = SessionRating.create(2).value as SessionRating;
      expect(rating.isNegative()).toBe(true);
    });

    it('returns false for rating 3', () => {
      const rating = SessionRating.create(3).value as SessionRating;
      expect(rating.isNegative()).toBe(false);
    });

    it('returns false for rating 4', () => {
      const rating = SessionRating.create(4).value as SessionRating;
      expect(rating.isNegative()).toBe(false);
    });

    it('returns false for rating 5', () => {
      const rating = SessionRating.create(5).value as SessionRating;
      expect(rating.isNegative()).toBe(false);
    });
  });

  describe('isNeutral()', () => {
    it('returns true only for rating 3', () => {
      expect((SessionRating.create(3).value as SessionRating).isNeutral()).toBe(true);
      expect((SessionRating.create(2).value as SessionRating).isNeutral()).toBe(false);
      expect((SessionRating.create(4).value as SessionRating).isNeutral()).toBe(false);
    });
  });

  describe('isPositive()', () => {
    it('returns true for rating 4', () => {
      const rating = SessionRating.create(4).value as SessionRating;
      expect(rating.isPositive()).toBe(true);
    });

    it('returns true for rating 5', () => {
      const rating = SessionRating.create(5).value as SessionRating;
      expect(rating.isPositive()).toBe(true);
    });

    it('returns false for rating 3', () => {
      const rating = SessionRating.create(3).value as SessionRating;
      expect(rating.isPositive()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('returns true for same value', () => {
      const a = SessionRating.create(4).value as SessionRating;
      const b = SessionRating.create(4).value as SessionRating;
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different values', () => {
      const a = SessionRating.create(4).value as SessionRating;
      const b = SessionRating.create(5).value as SessionRating;
      expect(a.equals(b)).toBe(false);
    });
  });
});
