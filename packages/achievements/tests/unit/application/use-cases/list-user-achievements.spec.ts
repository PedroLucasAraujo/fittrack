import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ListUserAchievements } from '../../../../application/use-cases/list-user-achievements.js';
import { CurrentValue } from '../../../../domain/value-objects/current-value.js';
import { TargetValue } from '../../../../domain/value-objects/target-value.js';
import { UserAchievementProgress } from '../../../../domain/aggregates/user-achievement-progress.js';
import { InMemoryAchievementDefinitionRepository } from '../../../repositories/in-memory-achievement-definition-repository.js';
import { InMemoryUserAchievementProgressRepository } from '../../../repositories/in-memory-user-achievement-progress-repository.js';
import {
  FailingAchievementDefinitionRepository,
  FailingUserAchievementProgressRepository,
} from '../../../stubs/failing-repositories.js';
import { makeAchievementDefinition } from '../../../helpers/make-achievement-definition.js';

describe('ListUserAchievements', () => {
  let definitionRepo: InMemoryAchievementDefinitionRepository;
  let progressRepo: InMemoryUserAchievementProgressRepository;
  let useCase: ListUserAchievements;
  let userId: string;

  beforeEach(async () => {
    definitionRepo = new InMemoryAchievementDefinitionRepository();
    progressRepo = new InMemoryUserAchievementProgressRepository();
    useCase = new ListUserAchievements(definitionRepo, progressRepo);
    userId = generateId();
  });

  it('returns empty list when no active definitions exist', async () => {
    const result = await useCase.execute({ userId });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.achievements).toHaveLength(0);
      expect(result.value.total).toBe(0);
      expect(result.value.unlockedCount).toBe(0);
    }
  });

  it('returns locked achievements (progressId null) for definitions without progress records', async () => {
    const definition = makeAchievementDefinition({ code: 'FIRST_WORKOUT', active: true });
    await definitionRepo.save(definition);

    const result = await useCase.execute({ userId });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.achievements).toHaveLength(1);
      const achievement = result.value.achievements[0]!;
      expect(achievement.progressId).toBeNull();
      expect(achievement.currentValue).toBe(0);
      expect(achievement.isUnlocked).toBe(false);
      expect(achievement.progressPercentage).toBe(0);
    }
  });

  it('includes progress data for achievements with progress records', async () => {
    const definition = makeAchievementDefinition({
      code: 'TEN_WORKOUTS',
      targetValue: 10,
      active: true,
    });
    await definitionRepo.save(definition);

    const current = CurrentValue.create(5);
    const target = TargetValue.create(10);
    if (current.isLeft() || target.isLeft()) throw new Error('test helper failed');

    const progressResult = UserAchievementProgress.create({
      userId,
      achievementDefinitionId: definition.id,
      achievementCode: 'TEN_WORKOUTS',
      achievementTier: 'BRONZE',
      achievementCategory: 'WORKOUT',
      currentValue: current.value,
      targetValue: target.value,
    });
    if (progressResult.isLeft()) throw new Error('test helper failed');
    await progressRepo.save(progressResult.value);

    const result = await useCase.execute({ userId });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const achievement = result.value.achievements[0]!;
      expect(achievement.progressId).not.toBeNull();
      expect(achievement.currentValue).toBe(5);
      expect(achievement.progressPercentage).toBe(50);
      expect(achievement.isUnlocked).toBe(false);
    }
  });

  it('marks achievement as unlocked when progress has unlockedAtUtc', async () => {
    const definition = makeAchievementDefinition({
      code: 'FIRST_WORKOUT',
      targetValue: 1,
      active: true,
    });
    await definitionRepo.save(definition);

    const current = CurrentValue.create(1);
    const target = TargetValue.create(1);
    if (current.isLeft() || target.isLeft()) throw new Error('test helper failed');

    const progressResult = UserAchievementProgress.create({
      userId,
      achievementDefinitionId: definition.id,
      achievementCode: 'FIRST_WORKOUT',
      achievementTier: 'BRONZE',
      achievementCategory: 'WORKOUT',
      currentValue: current.value,
      targetValue: target.value,
    });
    if (progressResult.isLeft()) throw new Error('test helper failed');
    const progress = progressResult.value;
    progress.unlock();
    await progressRepo.save(progress);

    const result = await useCase.execute({ userId });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.unlockedCount).toBe(1);
      const achievement = result.value.achievements[0]!;
      expect(achievement.isUnlocked).toBe(true);
      expect(achievement.unlockedAtUtc).not.toBeNull();
    }
  });

  describe('error paths', () => {
    it('returns Left when definitionRepo.findActive fails', async () => {
      const failingUseCase = new ListUserAchievements(
        new FailingAchievementDefinitionRepository(),
        progressRepo,
      );
      const result = await failingUseCase.execute({ userId });
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left when progressRepo.findByUserId fails', async () => {
      const failingUseCase = new ListUserAchievements(
        definitionRepo,
        new FailingUserAchievementProgressRepository(),
      );
      const result = await failingUseCase.execute({ userId });
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('filtering', () => {
    it('filter=unlocked returns only unlocked achievements', async () => {
      const d1 = makeAchievementDefinition({ code: 'FIRST_WORKOUT', targetValue: 1, active: true });
      const d2 = makeAchievementDefinition({ code: 'TEN_WORKOUTS', targetValue: 10, active: true });
      await definitionRepo.save(d1);
      await definitionRepo.save(d2);

      // Unlock d1
      const current = CurrentValue.create(1);
      const target = TargetValue.create(1);
      if (current.isLeft() || target.isLeft()) throw new Error('test helper failed');
      const p = UserAchievementProgress.create({
        userId,
        achievementDefinitionId: d1.id,
        achievementCode: 'FIRST_WORKOUT',
        achievementTier: 'BRONZE',
        achievementCategory: 'WORKOUT',
        currentValue: current.value,
        targetValue: target.value,
      });
      if (p.isLeft()) throw new Error('test helper failed');
      p.value.unlock();
      await progressRepo.save(p.value);

      const result = await useCase.execute({ userId, filter: 'unlocked' });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.achievements).toHaveLength(1);
        expect(result.value.achievements[0]!.code).toBe('FIRST_WORKOUT');
      }
    });

    it('filter=locked returns achievements with currentValue=0 (no actual progress)', async () => {
      const d1 = makeAchievementDefinition({ code: 'FIRST_WORKOUT', targetValue: 1, active: true });
      const d2 = makeAchievementDefinition({ code: 'TEN_WORKOUTS', targetValue: 10, active: true });
      await definitionRepo.save(d1);
      await definitionRepo.save(d2);

      // d2 has a progress record but with actual progress (currentValue > 0)
      const current = CurrentValue.create(3);
      const target = TargetValue.create(10);
      if (current.isLeft() || target.isLeft()) throw new Error('test helper failed');
      const p = UserAchievementProgress.create({
        userId,
        achievementDefinitionId: d2.id,
        achievementCode: 'TEN_WORKOUTS',
        achievementTier: 'BRONZE',
        achievementCategory: 'WORKOUT',
        currentValue: current.value,
        targetValue: target.value,
      });
      if (p.isLeft()) throw new Error('test helper failed');
      await progressRepo.save(p.value);

      const result = await useCase.execute({ userId, filter: 'locked' });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        // Only d1 has no progress (currentValue=0) — d2 has currentValue=3 so it's in_progress
        expect(result.value.achievements).toHaveLength(1);
        expect(result.value.achievements[0]!.code).toBe('FIRST_WORKOUT');
      }
    });

    it('filter=in_progress returns only non-unlocked achievements with some progress', async () => {
      const d1 = makeAchievementDefinition({ code: 'FIRST_WORKOUT', targetValue: 1, active: true });
      const d2 = makeAchievementDefinition({ code: 'TEN_WORKOUTS', targetValue: 10, active: true });
      await definitionRepo.save(d1);
      await definitionRepo.save(d2);

      // d1 has progress (currentValue=1) but is not unlocked via progress record
      const current = CurrentValue.create(3);
      const target = TargetValue.create(10);
      if (current.isLeft() || target.isLeft()) throw new Error('test helper failed');
      const p = UserAchievementProgress.create({
        userId,
        achievementDefinitionId: d2.id,
        achievementCode: 'TEN_WORKOUTS',
        achievementTier: 'BRONZE',
        achievementCategory: 'WORKOUT',
        currentValue: current.value,
        targetValue: target.value,
      });
      if (p.isLeft()) throw new Error('test helper failed');
      await progressRepo.save(p.value);

      const result = await useCase.execute({ userId, filter: 'in_progress' });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.achievements).toHaveLength(1);
        expect(result.value.achievements[0]!.code).toBe('TEN_WORKOUTS');
      }
    });
  });
});
