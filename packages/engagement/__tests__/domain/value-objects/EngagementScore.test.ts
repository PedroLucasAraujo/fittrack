import { describe, it, expect } from 'vitest';
import { EngagementScore } from '../../../domain/value-objects/EngagementScore.js';

describe('EngagementScore', () => {
  describe('create()', () => {
    it('accepts 0', () => {
      const result = EngagementScore.create(0);
      expect(result.isRight()).toBe(true);
      expect(result.value).toBeInstanceOf(EngagementScore);
      expect((result.value as EngagementScore).value).toBe(0);
    });

    it('accepts 100', () => {
      const result = EngagementScore.create(100);
      expect(result.isRight()).toBe(true);
      expect((result.value as EngagementScore).value).toBe(100);
    });

    it('accepts 50', () => {
      const result = EngagementScore.create(50);
      expect(result.isRight()).toBe(true);
    });

    it('rounds to nearest integer', () => {
      const result = EngagementScore.create(75.7);
      expect(result.isRight()).toBe(true);
      expect((result.value as EngagementScore).value).toBe(76);
    });

    it('rejects negative values', () => {
      const result = EngagementScore.create(-1);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects values above 100', () => {
      const result = EngagementScore.create(101);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects NaN', () => {
      const result = EngagementScore.create(NaN);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects Infinity', () => {
      const result = EngagementScore.create(Infinity);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('fromWorkouts()', () => {
    it('calculates 75 for 3/4 workouts', () => {
      const score = EngagementScore.fromWorkouts(3, 4);
      expect(score.value).toBe(75);
    });

    it('caps at 100 for 5/4 workouts', () => {
      const score = EngagementScore.fromWorkouts(5, 4);
      expect(score.value).toBe(100);
    });

    it('returns 0 for 0 workouts', () => {
      const score = EngagementScore.fromWorkouts(0, 4);
      expect(score.value).toBe(0);
    });

    it('returns 100 when target is 0', () => {
      const score = EngagementScore.fromWorkouts(0, 0);
      expect(score.value).toBe(100);
    });

    it('uses default target of 4', () => {
      const score = EngagementScore.fromWorkouts(4);
      expect(score.value).toBe(100);
    });
  });

  describe('fromHabit()', () => {
    it('returns 100 for 7 days', () => {
      expect(EngagementScore.fromHabit(7).value).toBe(100);
    });

    it('calculates correctly for 5 days', () => {
      expect(EngagementScore.fromHabit(5).value).toBe(71);
    });

    it('returns 0 for 0 days', () => {
      expect(EngagementScore.fromHabit(0).value).toBe(0);
    });
  });

  describe('fromGoalProgress()', () => {
    it('returns 100 when there are no active goals', () => {
      expect(EngagementScore.fromGoalProgress(0, 0).value).toBe(100);
    });

    it('calculates 50 for 1/2 goals on track', () => {
      expect(EngagementScore.fromGoalProgress(1, 2).value).toBe(50);
    });

    it('returns 100 for all goals on track', () => {
      expect(EngagementScore.fromGoalProgress(3, 3).value).toBe(100);
    });

    it('returns 0 for 0/3 on track', () => {
      expect(EngagementScore.fromGoalProgress(0, 3).value).toBe(0);
    });
  });

  describe('fromStreak()', () => {
    it('returns 40 for 12/30 days streak', () => {
      expect(EngagementScore.fromStreak(12, 30).value).toBe(40);
    });

    it('caps at 100', () => {
      expect(EngagementScore.fromStreak(60, 30).value).toBe(100);
    });

    it('returns 0 for streak 0', () => {
      expect(EngagementScore.fromStreak(0, 30).value).toBe(0);
    });

    it('returns 100 when target is 0', () => {
      expect(EngagementScore.fromStreak(5, 0).value).toBe(100);
    });

    it('uses default target of 30', () => {
      expect(EngagementScore.fromStreak(30).value).toBe(100);
    });
  });

  describe('fromWeighted()', () => {
    it('calculates correct weighted score', () => {
      const w = EngagementScore.create(80).value as EngagementScore;
      const h = EngagementScore.create(60).value as EngagementScore;
      const g = EngagementScore.create(50).value as EngagementScore;
      const s = EngagementScore.create(40).value as EngagementScore;
      // 80*0.4 + 60*0.25 + 50*0.2 + 40*0.15 = 32+15+10+6 = 63
      expect(EngagementScore.fromWeighted(w, h, g, s).value).toBe(63);
    });

    it('returns 100 for all perfect scores', () => {
      const perfect = EngagementScore.create(100).value as EngagementScore;
      expect(EngagementScore.fromWeighted(perfect, perfect, perfect, perfect).value).toBe(100);
    });

    it('returns 0 for all zero scores', () => {
      const zero = EngagementScore.create(0).value as EngagementScore;
      expect(EngagementScore.fromWeighted(zero, zero, zero, zero).value).toBe(0);
    });
  });

  describe('classification helpers', () => {
    it('isVeryHigh() returns true for 80+', () => {
      expect((EngagementScore.create(80).value as EngagementScore).isVeryHigh()).toBe(true);
      expect((EngagementScore.create(79).value as EngagementScore).isVeryHigh()).toBe(false);
    });

    it('isHigh() returns true for 60–79', () => {
      expect((EngagementScore.create(60).value as EngagementScore).isHigh()).toBe(true);
      expect((EngagementScore.create(80).value as EngagementScore).isHigh()).toBe(false);
    });

    it('isMedium() returns true for 40–59', () => {
      expect((EngagementScore.create(40).value as EngagementScore).isMedium()).toBe(true);
      expect((EngagementScore.create(60).value as EngagementScore).isMedium()).toBe(false);
    });

    it('isLow() returns true for 20–39', () => {
      expect((EngagementScore.create(20).value as EngagementScore).isLow()).toBe(true);
      expect((EngagementScore.create(40).value as EngagementScore).isLow()).toBe(false);
    });

    it('isVeryLow() returns true for <20', () => {
      expect((EngagementScore.create(19).value as EngagementScore).isVeryLow()).toBe(true);
      expect((EngagementScore.create(20).value as EngagementScore).isVeryLow()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('returns true for same value', () => {
      const a = EngagementScore.create(50).value as EngagementScore;
      const b = EngagementScore.create(50).value as EngagementScore;
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different values', () => {
      const a = EngagementScore.create(50).value as EngagementScore;
      const b = EngagementScore.create(51).value as EngagementScore;
      expect(a.equals(b)).toBe(false);
    });
  });
});
