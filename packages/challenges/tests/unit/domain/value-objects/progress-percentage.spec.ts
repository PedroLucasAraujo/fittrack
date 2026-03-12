import { describe, it, expect } from 'vitest';
import { ProgressPercentage } from '../../../../domain/value-objects/progress-percentage.js';

describe('ProgressPercentage', () => {
  describe('create()', () => {
    it('creates a valid percentage of 0', () => {
      const result = ProgressPercentage.create(0);
      expect(result.isRight()).toBe(true);
      expect((result.value as ProgressPercentage).value).toBe(0);
    });

    it('creates a valid percentage of 50', () => {
      const result = ProgressPercentage.create(50);
      expect(result.isRight()).toBe(true);
      expect((result.value as ProgressPercentage).value).toBe(50);
    });

    it('creates a valid percentage of 100', () => {
      const result = ProgressPercentage.create(100);
      expect(result.isRight()).toBe(true);
      expect((result.value as ProgressPercentage).value).toBe(100);
    });

    it('rejects values above 100', () => {
      const result = ProgressPercentage.create(101);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects negative values', () => {
      const result = ProgressPercentage.create(-1);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects NaN', () => {
      const result = ProgressPercentage.create(NaN);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects Infinity', () => {
      const result = ProgressPercentage.create(Infinity);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('calculate()', () => {
    it('returns 50% for 5/10', () => {
      const result = ProgressPercentage.calculate(5, 10);
      expect(result.isRight()).toBe(true);
      expect((result.value as ProgressPercentage).value).toBe(50);
    });

    it('returns 100% for 10/10', () => {
      const result = ProgressPercentage.calculate(10, 10);
      expect(result.isRight()).toBe(true);
      expect((result.value as ProgressPercentage).value).toBe(100);
    });

    it('caps at 100% for 15/10 (over-achievement)', () => {
      const result = ProgressPercentage.calculate(15, 10);
      expect(result.isRight()).toBe(true);
      expect((result.value as ProgressPercentage).value).toBe(100);
    });

    it('returns 0% for 0/10', () => {
      const result = ProgressPercentage.calculate(0, 10);
      expect(result.isRight()).toBe(true);
      expect((result.value as ProgressPercentage).value).toBe(0);
    });

    it('returns 100% when target is 0 (avoid divide-by-zero)', () => {
      const result = ProgressPercentage.calculate(0, 0);
      expect(result.isRight()).toBe(true);
      expect((result.value as ProgressPercentage).value).toBe(100);
    });

    it('returns 33% for 1/3 (rounds correctly)', () => {
      const result = ProgressPercentage.calculate(1, 3);
      expect(result.isRight()).toBe(true);
      expect((result.value as ProgressPercentage).value).toBe(33);
    });

    it('returns 67% for 2/3 (rounds correctly)', () => {
      const result = ProgressPercentage.calculate(2, 3);
      expect(result.isRight()).toBe(true);
      expect((result.value as ProgressPercentage).value).toBe(67);
    });
  });

  describe('isComplete()', () => {
    it('returns true when value is 100', () => {
      const p = ProgressPercentage.create(100).value as ProgressPercentage;
      expect(p.isComplete()).toBe(true);
    });

    it('returns false when value is 99', () => {
      const p = ProgressPercentage.create(99).value as ProgressPercentage;
      expect(p.isComplete()).toBe(false);
    });

    it('returns false when value is 0', () => {
      const p = ProgressPercentage.create(0).value as ProgressPercentage;
      expect(p.isComplete()).toBe(false);
    });
  });
});
