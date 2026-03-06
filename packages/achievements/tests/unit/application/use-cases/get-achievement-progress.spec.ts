import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { GetAchievementProgress } from '../../../../application/use-cases/get-achievement-progress.js';
import { CurrentValue } from '../../../../domain/value-objects/current-value.js';
import { TargetValue } from '../../../../domain/value-objects/target-value.js';
import { UserAchievementProgress } from '../../../../domain/aggregates/user-achievement-progress.js';
import { AchievementErrorCodes } from '../../../../domain/errors/achievement-error-codes.js';
import { InMemoryAchievementDefinitionRepository } from '../../../repositories/in-memory-achievement-definition-repository.js';
import { InMemoryUserAchievementProgressRepository } from '../../../repositories/in-memory-user-achievement-progress-repository.js';
import {
  FailingAchievementDefinitionRepository,
  FailingUserAchievementProgressRepository,
} from '../../../stubs/failing-repositories.js';
import { makeAchievementDefinition } from '../../../helpers/make-achievement-definition.js';

describe('GetAchievementProgress', () => {
  let definitionRepo: InMemoryAchievementDefinitionRepository;
  let progressRepo: InMemoryUserAchievementProgressRepository;
  let useCase: GetAchievementProgress;

  beforeEach(() => {
    definitionRepo = new InMemoryAchievementDefinitionRepository();
    progressRepo = new InMemoryUserAchievementProgressRepository();
    useCase = new GetAchievementProgress(definitionRepo, progressRepo);
  });

  it('returns locked progress (zero values) when no progress record exists', async () => {
    const definition = makeAchievementDefinition({
      code: 'FIRST_WORKOUT',
      targetValue: 1,
      active: true,
    });
    await definitionRepo.save(definition);
    const userId = generateId();

    const result = await useCase.execute({ userId, definitionId: definition.id });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const dto = result.value;
      expect(dto.progressId).toBeNull();
      expect(dto.currentValue).toBe(0);
      expect(dto.progressPercentage).toBe(0);
      expect(dto.isUnlocked).toBe(false);
      expect(dto.unlockedAtUtc).toBeNull();
    }
  });

  it('returns progress data when record exists', async () => {
    const definition = makeAchievementDefinition({
      code: 'TEN_WORKOUTS',
      targetValue: 10,
      active: true,
    });
    await definitionRepo.save(definition);
    const userId = generateId();

    const current = CurrentValue.create(7);
    const target = TargetValue.create(10);
    if (current.isLeft() || target.isLeft()) throw new Error('test helper');

    const progressResult = UserAchievementProgress.create({
      userId,
      achievementDefinitionId: definition.id,
      achievementCode: 'TEN_WORKOUTS',
      achievementTier: 'BRONZE',
      achievementCategory: 'WORKOUT',
      currentValue: current.value,
      targetValue: target.value,
    });
    if (progressResult.isLeft()) throw new Error('test helper');
    await progressRepo.save(progressResult.value);

    const result = await useCase.execute({ userId, definitionId: definition.id });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const dto = result.value;
      expect(dto.progressId).not.toBeNull();
      expect(dto.currentValue).toBe(7);
      expect(dto.targetValue).toBe(10);
      expect(dto.progressPercentage).toBe(70);
      expect(dto.isUnlocked).toBe(false);
    }
  });

  it('returns unlocked data for an unlocked achievement', async () => {
    const definition = makeAchievementDefinition({
      code: 'FIRST_WORKOUT',
      targetValue: 1,
      active: true,
    });
    await definitionRepo.save(definition);
    const userId = generateId();

    const current = CurrentValue.create(1);
    const target = TargetValue.create(1);
    if (current.isLeft() || target.isLeft()) throw new Error('test helper');

    const progressResult = UserAchievementProgress.create({
      userId,
      achievementDefinitionId: definition.id,
      achievementCode: 'FIRST_WORKOUT',
      achievementTier: 'BRONZE',
      achievementCategory: 'WORKOUT',
      currentValue: current.value,
      targetValue: target.value,
    });
    if (progressResult.isLeft()) throw new Error('test helper');
    const progress = progressResult.value;
    progress.unlock();
    await progressRepo.save(progress);

    const result = await useCase.execute({ userId, definitionId: definition.id });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.isUnlocked).toBe(true);
      expect(result.value.progressPercentage).toBe(100);
      expect(result.value.unlockedAtUtc).not.toBeNull();
    }
  });

  it('returns Left when definition is not found', async () => {
    const result = await useCase.execute({ userId: generateId(), definitionId: 'non-existent' });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AchievementErrorCodes.ACHIEVEMENT_DEFINITION_NOT_FOUND);
    }
  });

  it('returns Left when definitionRepo.findById fails', async () => {
    const failingUseCase = new GetAchievementProgress(
      new FailingAchievementDefinitionRepository(),
      progressRepo,
    );
    const result = await failingUseCase.execute({ userId: generateId(), definitionId: 'any' });
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left when progressRepo.findByUserAndDefinition fails', async () => {
    const definition = makeAchievementDefinition({ code: 'FIRST_WORKOUT', active: true });
    await definitionRepo.save(definition);
    const failingUseCase = new GetAchievementProgress(
      definitionRepo,
      new FailingUserAchievementProgressRepository(),
    );
    const result = await failingUseCase.execute({
      userId: generateId(),
      definitionId: definition.id,
    });
    expect(result.isLeft()).toBe(true);
  });

  it('exposes definition metadata in response', async () => {
    const definition = makeAchievementDefinition({
      code: 'FIRST_WORKOUT',
      category: 'WORKOUT',
      tier: 'BRONZE',
      active: true,
    });
    await definitionRepo.save(definition);

    const result = await useCase.execute({ userId: generateId(), definitionId: definition.id });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const dto = result.value;
      expect(dto.code).toBe('FIRST_WORKOUT');
      expect(dto.category).toBe('WORKOUT');
      expect(dto.tier).toBe('BRONZE');
      expect(dto.tierColor).toBe('#CD7F32');
      expect(dto.metricType).toBe('workout_count');
    }
  });
});
