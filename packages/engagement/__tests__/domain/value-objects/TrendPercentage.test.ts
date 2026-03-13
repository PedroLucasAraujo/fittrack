import { describe, it, expect } from 'vitest';
import { TrendPercentage } from '../../../domain/value-objects/TrendPercentage.js';

describe('TrendPercentage', () => {
  describe('create()', () => {
    it('accepts positive value', () => {
      expect(TrendPercentage.create(30).isRight()).toBe(true);
    });

    it('accepts negative value', () => {
      expect(TrendPercentage.create(-20).isRight()).toBe(true);
    });

    it('accepts 0', () => {
      expect(TrendPercentage.create(0).isRight()).toBe(true);
    });

    it('rejects NaN', () => {
      expect(TrendPercentage.create(NaN).isLeft()).toBe(true);
    });

    it('rejects Infinity', () => {
      expect(TrendPercentage.create(Infinity).isLeft()).toBe(true);
    });
  });

  describe('calculate()', () => {
    it('calculates +30% improvement', () => {
      const pct = TrendPercentage.calculate(65, 50);
      expect(pct.value).toBe(30);
    });

    it('calculates -20% decline', () => {
      const pct = TrendPercentage.calculate(40, 50);
      expect(pct.value).toBe(-20);
    });

    it('returns 0 when both are 0', () => {
      const pct = TrendPercentage.calculate(0, 0);
      expect(pct.value).toBe(0);
    });

    it('returns 100 when previous is 0 and current > 0', () => {
      const pct = TrendPercentage.calculate(50, 0);
      expect(pct.value).toBe(100);
    });

    it('returns 0 when current is 0 and previous is 0', () => {
      const pct = TrendPercentage.calculate(0, 0);
      expect(pct.value).toBe(0);
    });
  });

  describe('helpers', () => {
    it('isImprovement() for positive value', () => {
      expect((TrendPercentage.create(10).value as TrendPercentage).isImprovement()).toBe(true);
    });

    it('isDecline() for negative value', () => {
      expect((TrendPercentage.create(-10).value as TrendPercentage).isDecline()).toBe(true);
    });

    it('isImprovement() returns false for 0', () => {
      expect((TrendPercentage.create(0).value as TrendPercentage).isImprovement()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('returns true for same percentage', () => {
      const a = TrendPercentage.create(30).value as TrendPercentage;
      const b = TrendPercentage.create(30).value as TrendPercentage;
      expect(a.equals(b)).toBe(true);
    });
  });
});
