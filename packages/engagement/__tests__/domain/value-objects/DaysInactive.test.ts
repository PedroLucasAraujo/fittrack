import { describe, it, expect } from 'vitest';
import { DaysInactive } from '../../../domain/value-objects/DaysInactive.js';

describe('DaysInactive', () => {
  describe('create()', () => {
    it('accepts 0', () => {
      expect(DaysInactive.create(0).isRight()).toBe(true);
    });

    it('accepts positive integer', () => {
      expect(DaysInactive.create(10).isRight()).toBe(true);
    });

    it('rejects negative value', () => {
      expect(DaysInactive.create(-1).isLeft()).toBe(true);
    });

    it('rejects non-integer', () => {
      expect(DaysInactive.create(1.5).isLeft()).toBe(true);
    });

    it('rejects NaN', () => {
      expect(DaysInactive.create(NaN).isLeft()).toBe(true);
    });
  });

  describe('isChurnRisk()', () => {
    it('returns true for 7 days', () => {
      expect((DaysInactive.create(7).value as DaysInactive).isChurnRisk()).toBe(true);
    });

    it('returns true for 30 days', () => {
      expect((DaysInactive.create(30).value as DaysInactive).isChurnRisk()).toBe(true);
    });

    it('returns false for 6 days', () => {
      expect((DaysInactive.create(6).value as DaysInactive).isChurnRisk()).toBe(false);
    });

    it('returns false for 0 days', () => {
      expect((DaysInactive.create(0).value as DaysInactive).isChurnRisk()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('returns true for same value', () => {
      const a = DaysInactive.create(5).value as DaysInactive;
      const b = DaysInactive.create(5).value as DaysInactive;
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different values', () => {
      const a = DaysInactive.create(5).value as DaysInactive;
      const b = DaysInactive.create(6).value as DaysInactive;
      expect(a.equals(b)).toBe(false);
    });
  });
});
