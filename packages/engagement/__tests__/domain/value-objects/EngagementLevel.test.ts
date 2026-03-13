import { describe, it, expect } from 'vitest';
import { EngagementLevel } from '../../../domain/value-objects/EngagementLevel.js';
import { EngagementScore } from '../../../domain/value-objects/EngagementScore.js';

function score(v: number): EngagementScore {
  return EngagementScore.create(v).value as EngagementScore;
}

describe('EngagementLevel', () => {
  describe('create()', () => {
    it('accepts valid levels', () => {
      for (const level of ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW']) {
        expect(EngagementLevel.create(level).isRight()).toBe(true);
      }
    });

    it('rejects invalid value', () => {
      expect(EngagementLevel.create('UNKNOWN').isLeft()).toBe(true);
    });

    it('rejects empty string', () => {
      expect(EngagementLevel.create('').isLeft()).toBe(true);
    });
  });

  describe('fromScore()', () => {
    it('returns VERY_HIGH for score 80', () => {
      expect(EngagementLevel.fromScore(score(80)).value).toBe('VERY_HIGH');
    });

    it('returns VERY_HIGH for score 100', () => {
      expect(EngagementLevel.fromScore(score(100)).value).toBe('VERY_HIGH');
    });

    it('returns HIGH for score 60', () => {
      expect(EngagementLevel.fromScore(score(60)).value).toBe('HIGH');
    });

    it('returns HIGH for score 79', () => {
      expect(EngagementLevel.fromScore(score(79)).value).toBe('HIGH');
    });

    it('returns MEDIUM for score 40', () => {
      expect(EngagementLevel.fromScore(score(40)).value).toBe('MEDIUM');
    });

    it('returns MEDIUM for score 59', () => {
      expect(EngagementLevel.fromScore(score(59)).value).toBe('MEDIUM');
    });

    it('returns LOW for score 20', () => {
      expect(EngagementLevel.fromScore(score(20)).value).toBe('LOW');
    });

    it('returns LOW for score 39', () => {
      expect(EngagementLevel.fromScore(score(39)).value).toBe('LOW');
    });

    it('returns VERY_LOW for score 19', () => {
      expect(EngagementLevel.fromScore(score(19)).value).toBe('VERY_LOW');
    });

    it('returns VERY_LOW for score 0', () => {
      expect(EngagementLevel.fromScore(score(0)).value).toBe('VERY_LOW');
    });
  });

  describe('isAtRisk()', () => {
    it('returns true for LOW', () => {
      expect(EngagementLevel.create('LOW').value).not.toBeUndefined();
      expect((EngagementLevel.create('LOW').value as EngagementLevel).isAtRisk()).toBe(true);
    });

    it('returns true for VERY_LOW', () => {
      expect((EngagementLevel.create('VERY_LOW').value as EngagementLevel).isAtRisk()).toBe(true);
    });

    it('returns false for MEDIUM', () => {
      expect((EngagementLevel.create('MEDIUM').value as EngagementLevel).isAtRisk()).toBe(false);
    });

    it('returns false for HIGH', () => {
      expect((EngagementLevel.create('HIGH').value as EngagementLevel).isAtRisk()).toBe(false);
    });

    it('returns false for VERY_HIGH', () => {
      expect((EngagementLevel.create('VERY_HIGH').value as EngagementLevel).isAtRisk()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('returns true for same level', () => {
      const a = EngagementLevel.create('HIGH').value as EngagementLevel;
      const b = EngagementLevel.create('HIGH').value as EngagementLevel;
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different levels', () => {
      const a = EngagementLevel.create('HIGH').value as EngagementLevel;
      const b = EngagementLevel.create('LOW').value as EngagementLevel;
      expect(a.equals(b)).toBe(false);
    });
  });
});
