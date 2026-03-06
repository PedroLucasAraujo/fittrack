import { describe, it, expect } from 'vitest';
import { AchievementCode } from '../../../../domain/value-objects/achievement-code.js';
import { AchievementErrorCodes } from '../../../../domain/errors/achievement-error-codes.js';

describe('AchievementCode', () => {
  describe('create()', () => {
    it('returns Right<AchievementCode> for a valid code', () => {
      const result = AchievementCode.create('FIRST_WORKOUT');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('FIRST_WORKOUT');
      }
    });

    it('accepts any UPPERCASE_SNAKE_CASE code', () => {
      const codes = ['FIRST_WORKOUT', 'STREAK_7_DAYS', 'MY_NEW_ACHIEVEMENT_2025'];
      for (const code of codes) {
        expect(AchievementCode.create(code).isRight()).toBe(true);
      }
    });

    it('trims whitespace before validation', () => {
      const result = AchievementCode.create('  FIRST_WORKOUT  ');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('FIRST_WORKOUT');
      }
    });

    it('returns Left for empty string', () => {
      const result = AchievementCode.create('');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(AchievementErrorCodes.INVALID_ACHIEVEMENT_CODE);
      }
    });

    it('returns Left for whitespace-only string', () => {
      const result = AchievementCode.create('   ');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for lowercase code', () => {
      const result = AchievementCode.create('first_workout');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(AchievementErrorCodes.INVALID_ACHIEVEMENT_CODE);
        expect(result.value.message).toMatch(/UPPERCASE_SNAKE_CASE/);
      }
    });

    it('returns Left for code with spaces', () => {
      const result = AchievementCode.create('FIRST WORKOUT');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for code exceeding 50 characters', () => {
      const longCode = 'A'.repeat(51);
      const result = AchievementCode.create(longCode);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('equals()', () => {
    it('returns true for codes with same value', () => {
      const a = AchievementCode.create('FIRST_WORKOUT');
      const b = AchievementCode.create('FIRST_WORKOUT');
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(true);
      }
    });

    it('returns false for codes with different values', () => {
      const a = AchievementCode.create('FIRST_WORKOUT');
      const b = AchievementCode.create('TEN_WORKOUTS');
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(false);
      }
    });
  });

  describe('toString()', () => {
    it('returns the code value', () => {
      const result = AchievementCode.create('HUNDRED_WORKOUTS');
      if (result.isRight()) {
        expect(result.value.toString()).toBe('HUNDRED_WORKOUTS');
      }
    });
  });
});
