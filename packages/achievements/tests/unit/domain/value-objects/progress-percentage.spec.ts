import { describe, it, expect } from 'vitest';
import { ProgressPercentage } from '../../../../domain/value-objects/progress-percentage.js';

describe('ProgressPercentage', () => {
  describe('compute()', () => {
    it('returns 50% for half progress', () => {
      const p = ProgressPercentage.compute(50, 100);
      expect(p.value).toBe(50);
    });

    it('returns 100% when current equals target', () => {
      const p = ProgressPercentage.compute(10, 10);
      expect(p.value).toBe(100);
    });

    it('caps at 100% when current exceeds target', () => {
      const p = ProgressPercentage.compute(150, 100);
      expect(p.value).toBe(100);
    });

    it('returns 0% for zero current value', () => {
      const p = ProgressPercentage.compute(0, 100);
      expect(p.value).toBe(0);
    });

    it('returns 0% when target is 0 (guard against division by zero)', () => {
      const p = ProgressPercentage.compute(5, 0);
      expect(p.value).toBe(0);
    });

    it('rounds to integer', () => {
      const p = ProgressPercentage.compute(1, 3);
      expect(p.value).toBe(33);
    });

    it('rounds 0.5 up', () => {
      const p = ProgressPercentage.compute(1, 2);
      expect(p.value).toBe(50);
    });
  });

  describe('isComplete()', () => {
    it('returns true when 100%', () => {
      expect(ProgressPercentage.compute(10, 10).isComplete()).toBe(true);
    });

    it('returns true when exceeds 100%', () => {
      expect(ProgressPercentage.compute(200, 100).isComplete()).toBe(true);
    });

    it('returns false when below 100%', () => {
      expect(ProgressPercentage.compute(9, 10).isComplete()).toBe(false);
    });

    it('returns false for 0%', () => {
      expect(ProgressPercentage.compute(0, 100).isComplete()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('returns true for same percentage', () => {
      const a = ProgressPercentage.compute(50, 100);
      const b = ProgressPercentage.compute(50, 100);
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different percentages', () => {
      const a = ProgressPercentage.compute(30, 100);
      const b = ProgressPercentage.compute(50, 100);
      expect(a.equals(b)).toBe(false);
    });
  });
});
