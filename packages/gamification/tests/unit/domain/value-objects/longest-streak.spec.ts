import { describe, it, expect } from 'vitest';
import { LongestStreak } from '../../../../domain/value-objects/longest-streak.js';

describe('LongestStreak', () => {
  describe('create()', () => {
    it('creates zero value', () => {
      const result = LongestStreak.create(0);
      expect(result.isRight()).toBe(true);
      expect(result.value).toBeInstanceOf(LongestStreak);
      expect((result.value as LongestStreak).value).toBe(0);
    });

    it('creates positive integer value', () => {
      const result = LongestStreak.create(42);
      expect(result.isRight()).toBe(true);
      expect((result.value as LongestStreak).value).toBe(42);
    });

    it('creates max allowed value (10_000)', () => {
      const result = LongestStreak.create(10_000);
      expect(result.isRight()).toBe(true);
      expect((result.value as LongestStreak).value).toBe(10_000);
    });

    it('rejects negative value', () => {
      const result = LongestStreak.create(-1);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects value above max (10_001)', () => {
      const result = LongestStreak.create(10_001);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects non-integer (float)', () => {
      const result = LongestStreak.create(3.5);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects NaN', () => {
      const result = LongestStreak.create(NaN);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('zero()', () => {
    it('returns instance with value 0', () => {
      const ls = LongestStreak.zero();
      expect(ls).toBeInstanceOf(LongestStreak);
      expect(ls.value).toBe(0);
    });
  });
});
