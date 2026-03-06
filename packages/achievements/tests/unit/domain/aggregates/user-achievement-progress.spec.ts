import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { UserAchievementProgress } from '../../../../domain/aggregates/user-achievement-progress.js';
import { CurrentValue } from '../../../../domain/value-objects/current-value.js';
import { TargetValue } from '../../../../domain/value-objects/target-value.js';
import { AchievementErrorCodes } from '../../../../domain/errors/achievement-error-codes.js';

function makeProgress(
  overrides: {
    currentValue?: CurrentValue;
    targetValue?: TargetValue;
  } = {},
) {
  const defaultCurrent = CurrentValue.zero();
  const defaultTarget = TargetValue.create(10);
  if (defaultTarget.isLeft()) throw new Error('test helper: TargetValue.create failed');

  return UserAchievementProgress.create({
    userId: generateId(),
    achievementDefinitionId: generateId(),
    achievementCode: 'TEN_WORKOUTS',
    achievementTier: 'BRONZE',
    achievementCategory: 'WORKOUT',
    currentValue: overrides.currentValue ?? defaultCurrent,
    targetValue: overrides.targetValue ?? defaultTarget.value,
  });
}

describe('UserAchievementProgress', () => {
  describe('create()', () => {
    it('creates progress in locked state (currentValue=0, unlockedAt=null)', () => {
      const result = makeProgress();
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const p = result.value;
        expect(p.currentValue.value).toBe(0);
        expect(p.unlockedAtUtc).toBeNull();
        expect(p.isUnlocked()).toBe(false);
        expect(p.hasReachedTarget()).toBe(false);
        expect(p.version).toBe(0);
        expect(p.getDomainEvents()).toHaveLength(0);
      }
    });

    it('generates a UUID id', () => {
      const result = makeProgress();
      if (result.isRight()) {
        expect(result.value.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      }
    });

    it('exposes all getters', () => {
      const result = makeProgress();
      if (result.isRight()) {
        const p = result.value;
        expect(typeof p.userId).toBe('string');
        expect(typeof p.achievementDefinitionId).toBe('string');
        expect(p.achievementCode).toBe('TEN_WORKOUTS');
        expect(p.achievementTier).toBe('BRONZE');
        expect(p.achievementCategory).toBe('WORKOUT');
        expect(typeof p.createdAtUtc).toBe('string');
        expect(typeof p.lastUpdatedAtUtc).toBe('string');
      }
    });
  });

  describe('updateProgress()', () => {
    it('updates currentValue when new value is higher', () => {
      const result = makeProgress();
      if (result.isRight()) {
        const p = result.value;
        const newValue = CurrentValue.create(5);
        if (newValue.isRight()) {
          const updateResult = p.updateProgress(newValue.value);
          expect(updateResult.isRight()).toBe(true);
          expect(p.currentValue.value).toBe(5);
        }
      }
    });

    it('accepts same value (idempotent boundary)', () => {
      const result = makeProgress();
      if (result.isRight()) {
        const p = result.value;
        const sameValue = CurrentValue.zero();
        const updateResult = p.updateProgress(sameValue);
        expect(updateResult.isRight()).toBe(true);
      }
    });

    it('returns Left when new value is less than current', () => {
      const startValue = CurrentValue.create(5);
      if (startValue.isRight()) {
        const result = makeProgress({ currentValue: startValue.value });
        if (result.isRight()) {
          const p = result.value;
          const lowerValue = CurrentValue.create(3);
          if (lowerValue.isRight()) {
            const updateResult = p.updateProgress(lowerValue.value);
            expect(updateResult.isLeft()).toBe(true);
            if (updateResult.isLeft()) {
              expect(updateResult.value.code).toBe(AchievementErrorCodes.INVALID_PROGRESS_VALUE);
            }
          }
        }
      }
    });
  });

  describe('hasReachedTarget()', () => {
    it('returns false when below target', () => {
      const result = makeProgress();
      if (result.isRight()) {
        expect(result.value.hasReachedTarget()).toBe(false);
      }
    });

    it('returns true when currentValue equals target', () => {
      const current = CurrentValue.create(10);
      const target = TargetValue.create(10);
      if (current.isRight() && target.isRight()) {
        const result = makeProgress({ currentValue: current.value, targetValue: target.value });
        if (result.isRight()) {
          expect(result.value.hasReachedTarget()).toBe(true);
        }
      }
    });

    it('returns true when currentValue exceeds target', () => {
      const current = CurrentValue.create(15);
      const target = TargetValue.create(10);
      if (current.isRight() && target.isRight()) {
        const result = makeProgress({ currentValue: current.value, targetValue: target.value });
        if (result.isRight()) {
          expect(result.value.hasReachedTarget()).toBe(true);
        }
      }
    });
  });

  describe('unlock()', () => {
    it('sets unlockedAtUtc and isUnlocked returns true', () => {
      const current = CurrentValue.create(10);
      const target = TargetValue.create(10);
      if (current.isRight() && target.isRight()) {
        const result = makeProgress({ currentValue: current.value, targetValue: target.value });
        if (result.isRight()) {
          const p = result.value;
          const unlockResult = p.unlock();
          expect(unlockResult.isRight()).toBe(true);
          expect(p.isUnlocked()).toBe(true);
          expect(p.unlockedAtUtc).not.toBeNull();
        }
      }
    });

    it('returns Left if already unlocked (idempotent guard)', () => {
      const current = CurrentValue.create(10);
      const target = TargetValue.create(10);
      if (current.isRight() && target.isRight()) {
        const result = makeProgress({ currentValue: current.value, targetValue: target.value });
        if (result.isRight()) {
          const p = result.value;
          p.unlock();
          const secondUnlock = p.unlock();
          expect(secondUnlock.isLeft()).toBe(true);
          if (secondUnlock.isLeft()) {
            expect(secondUnlock.value.code).toBe(
              AchievementErrorCodes.ACHIEVEMENT_ALREADY_UNLOCKED,
            );
          }
        }
      }
    });
  });

  describe('progressPercentage()', () => {
    it('returns 0% initially', () => {
      const result = makeProgress();
      if (result.isRight()) {
        expect(result.value.progressPercentage().value).toBe(0);
      }
    });

    it('returns 50% for half progress', () => {
      const current = CurrentValue.create(5);
      const target = TargetValue.create(10);
      if (current.isRight() && target.isRight()) {
        const result = makeProgress({ currentValue: current.value, targetValue: target.value });
        if (result.isRight()) {
          expect(result.value.progressPercentage().value).toBe(50);
        }
      }
    });

    it('returns 100% when target reached', () => {
      const current = CurrentValue.create(10);
      const target = TargetValue.create(10);
      if (current.isRight() && target.isRight()) {
        const result = makeProgress({ currentValue: current.value, targetValue: target.value });
        if (result.isRight()) {
          expect(result.value.progressPercentage().value).toBe(100);
        }
      }
    });
  });

  describe('reconstitute()', () => {
    it('restores all props and version', () => {
      const createResult = makeProgress();
      if (createResult.isRight()) {
        const original = createResult.value;
        const reconstituted = UserAchievementProgress.reconstitute(
          original.id,
          {
            userId: original.userId,
            achievementDefinitionId: original.achievementDefinitionId,
            achievementCode: original.achievementCode,
            achievementTier: original.achievementTier,
            achievementCategory: original.achievementCategory,
            currentValue: original.currentValue,
            targetValue: original.targetValue,
            unlockedAtUtc: '2026-01-01T00:00:00.000Z',
            lastUpdatedAtUtc: original.lastUpdatedAtUtc,
            createdAtUtc: original.createdAtUtc,
          },
          5,
        );
        expect(reconstituted.id).toBe(original.id);
        expect(reconstituted.version).toBe(5);
        expect(reconstituted.isUnlocked()).toBe(true);
      }
    });
  });
});
