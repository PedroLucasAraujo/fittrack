import { describe, it, expect } from 'vitest';
import { ChallengeCategory } from '../../../../domain/value-objects/challenge-category.js';

describe('ChallengeCategory', () => {
  describe('create()', () => {
    it('creates WORKOUT category', () => {
      const result = ChallengeCategory.create('WORKOUT');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('WORKOUT');
    });

    it('creates NUTRITION category', () => {
      const result = ChallengeCategory.create('NUTRITION');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('NUTRITION');
    });

    it('creates STREAK category', () => {
      const result = ChallengeCategory.create('STREAK');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('STREAK');
    });

    it('creates VOLUME category', () => {
      const result = ChallengeCategory.create('VOLUME');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('VOLUME');
    });

    it('rejects invalid category', () => {
      const result = ChallengeCategory.create('YOGA');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty string', () => {
      const result = ChallengeCategory.create('');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects lowercase valid value', () => {
      const result = ChallengeCategory.create('workout');
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('type guards', () => {
    it('isWorkout() returns true for WORKOUT', () => {
      const c = ChallengeCategory.create('WORKOUT').value as ChallengeCategory;
      expect(c.isWorkout()).toBe(true);
      expect(c.isNutrition()).toBe(false);
      expect(c.isStreak()).toBe(false);
      expect(c.isVolume()).toBe(false);
    });

    it('isNutrition() returns true for NUTRITION', () => {
      const c = ChallengeCategory.create('NUTRITION').value as ChallengeCategory;
      expect(c.isNutrition()).toBe(true);
      expect(c.isWorkout()).toBe(false);
    });

    it('isStreak() returns true for STREAK', () => {
      const c = ChallengeCategory.create('STREAK').value as ChallengeCategory;
      expect(c.isStreak()).toBe(true);
      expect(c.isWorkout()).toBe(false);
    });

    it('isVolume() returns true for VOLUME', () => {
      const c = ChallengeCategory.create('VOLUME').value as ChallengeCategory;
      expect(c.isVolume()).toBe(true);
      expect(c.isWorkout()).toBe(false);
    });
  });
});
