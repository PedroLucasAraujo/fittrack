import { describe, it, expect } from 'vitest';
import { CurrentProgress } from '../../../../domain/value-objects/current-progress.js';

describe('CurrentProgress', () => {
  describe('create()', () => {
    it('creates a valid progress of 0', () => {
      const result = CurrentProgress.create(0);
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe(0);
    });

    it('creates a valid progress of 100', () => {
      const result = CurrentProgress.create(100);
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe(100);
    });

    it('creates a valid large progress value', () => {
      const result = CurrentProgress.create(9999);
      expect(result.isRight()).toBe(true);
    });

    it('rejects negative values', () => {
      const result = CurrentProgress.create(-1);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects -0.01', () => {
      const result = CurrentProgress.create(-0.01);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects NaN', () => {
      const result = CurrentProgress.create(NaN);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects Infinity', () => {
      const result = CurrentProgress.create(Infinity);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('zero()', () => {
    it('returns a CurrentProgress of 0', () => {
      const p = CurrentProgress.zero();
      expect(p.value).toBe(0);
    });
  });

  describe('increment()', () => {
    it('increments the progress by the given amount', () => {
      const p = CurrentProgress.create(5).value as CurrentProgress;
      const result = p.increment(3);
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe(8);
    });

    it('increments by 0 (noop)', () => {
      const p = CurrentProgress.create(5).value as CurrentProgress;
      const result = p.increment(0);
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe(5);
    });

    it('returns a new CurrentProgress instance (immutable)', () => {
      const p = CurrentProgress.create(5).value as CurrentProgress;
      const result = p.increment(3);
      expect(result.value.value).toBe(8);
      expect(p.value).toBe(5); // original unchanged
    });

    it('rejects negative increment amount', () => {
      const p = CurrentProgress.create(5).value as CurrentProgress;
      const result = p.increment(-1);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects NaN increment', () => {
      const p = CurrentProgress.create(5).value as CurrentProgress;
      const result = p.increment(NaN);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('hasReached()', () => {
    it('returns true when value equals target', () => {
      const p = CurrentProgress.create(10).value as CurrentProgress;
      expect(p.hasReached(10)).toBe(true);
    });

    it('returns true when value exceeds target', () => {
      const p = CurrentProgress.create(15).value as CurrentProgress;
      expect(p.hasReached(10)).toBe(true);
    });

    it('returns false when value is below target', () => {
      const p = CurrentProgress.create(9).value as CurrentProgress;
      expect(p.hasReached(10)).toBe(false);
    });

    it('returns false when value is 0 and target is 1', () => {
      const p = CurrentProgress.create(0).value as CurrentProgress;
      expect(p.hasReached(1)).toBe(false);
    });
  });
});
