import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, left } from '@fittrack/core';
import type { DomainError, Either } from '@fittrack/core';
import { DomainError as CoreDomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ListAvailableAchievements } from '../../../../application/use-cases/list-available-achievements.js';
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

class StubError extends CoreDomainError {
  constructor() {
    super('stub', 'CORE.INTERNAL_ERROR' as ErrorCode);
  }
}

class FindByUserIdFailingProgressRepo extends InMemoryUserAchievementProgressRepository {
  override async findByUserId(_: string): Promise<Either<DomainError, UserAchievementProgress[]>> {
    return left(new StubError() as DomainError);
  }
}

describe('ListAvailableAchievements', () => {
  let definitionRepo: InMemoryAchievementDefinitionRepository;
  let progressRepo: InMemoryUserAchievementProgressRepository;
  let useCase: ListAvailableAchievements;

  beforeEach(() => {
    definitionRepo = new InMemoryAchievementDefinitionRepository();
    progressRepo = new InMemoryUserAchievementProgressRepository();
    useCase = new ListAvailableAchievements(definitionRepo, progressRepo);
  });

  it('returns empty when no active definitions exist', async () => {
    const result = await useCase.execute({ userId: generateId() });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.achievements).toHaveLength(0);
      expect(result.value.total).toBe(0);
    }
  });

  it('returns all active definitions when user has no unlocked achievements', async () => {
    const d1 = makeAchievementDefinition({ code: 'FIRST_WORKOUT', targetValue: 1, active: true });
    const d2 = makeAchievementDefinition({ code: 'TEN_WORKOUTS', targetValue: 10, active: true });
    await definitionRepo.save(d1);
    await definitionRepo.save(d2);

    const result = await useCase.execute({ userId: generateId() });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.achievements).toHaveLength(2);
      expect(result.value.total).toBe(2);
    }
  });

  it('excludes already-unlocked achievements', async () => {
    const d1 = makeAchievementDefinition({ code: 'FIRST_WORKOUT', targetValue: 1, active: true });
    const d2 = makeAchievementDefinition({ code: 'TEN_WORKOUTS', targetValue: 10, active: true });
    await definitionRepo.save(d1);
    await definitionRepo.save(d2);

    const userId = generateId();
    const current = CurrentValue.create(1);
    const target = TargetValue.create(1);
    if (current.isLeft() || target.isLeft()) throw new Error('test helper');

    const p = UserAchievementProgress.create({
      userId,
      achievementDefinitionId: d1.id,
      achievementCode: 'FIRST_WORKOUT',
      currentValue: current.value,
      targetValue: target.value,
    });
    if (p.isLeft()) throw new Error('test helper');
    p.value.unlock();
    await progressRepo.save(p.value);

    const result = await useCase.execute({ userId });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.achievements).toHaveLength(1);
      expect(result.value.achievements[0]!.code).toBe('TEN_WORKOUTS');
      expect(result.value.achievements[0]!.isUnlocked).toBe(false);
    }
  });

  describe('error paths', () => {
    it('returns Left when definitionRepo.findActive fails', async () => {
      const failingUseCase = new ListAvailableAchievements(
        new FailingAchievementDefinitionRepository(),
        progressRepo,
      );
      const result = await failingUseCase.execute({ userId: generateId() });
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left when progressRepo.findUnlockedByUserId fails', async () => {
      const definition = makeAchievementDefinition({ code: 'FIRST_WORKOUT', active: true });
      await definitionRepo.save(definition);
      const failingUseCase = new ListAvailableAchievements(
        definitionRepo,
        new FailingUserAchievementProgressRepository(),
      );
      const result = await failingUseCase.execute({ userId: generateId() });
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left when progressRepo.findByUserId fails', async () => {
      const definition = makeAchievementDefinition({ code: 'FIRST_WORKOUT', active: true });
      await definitionRepo.save(definition);
      const failingUseCase = new ListAvailableAchievements(
        definitionRepo,
        new FindByUserIdFailingProgressRepo(),
      );
      const result = await failingUseCase.execute({ userId: generateId() });
      expect(result.isLeft()).toBe(true);
    });
  });

  it('sorts results by progressPercentage descending', async () => {
    const d1 = makeAchievementDefinition({ code: 'FIRST_WORKOUT', targetValue: 10, active: true });
    const d2 = makeAchievementDefinition({ code: 'TEN_WORKOUTS', targetValue: 100, active: true });
    await definitionRepo.save(d1);
    await definitionRepo.save(d2);

    const userId = generateId();

    // d1: 8/10 = 80%
    const c1 = CurrentValue.create(8);
    const t1 = TargetValue.create(10);
    if (c1.isLeft() || t1.isLeft()) throw new Error('test helper');
    const p1 = UserAchievementProgress.create({
      userId,
      achievementDefinitionId: d1.id,
      achievementCode: 'FIRST_WORKOUT',
      currentValue: c1.value,
      targetValue: t1.value,
    });
    if (p1.isLeft()) throw new Error('test helper');
    await progressRepo.save(p1.value);

    // d2: 20/100 = 20%
    const c2 = CurrentValue.create(20);
    const t2 = TargetValue.create(100);
    if (c2.isLeft() || t2.isLeft()) throw new Error('test helper');
    const p2 = UserAchievementProgress.create({
      userId,
      achievementDefinitionId: d2.id,
      achievementCode: 'TEN_WORKOUTS',
      currentValue: c2.value,
      targetValue: t2.value,
    });
    if (p2.isLeft()) throw new Error('test helper');
    await progressRepo.save(p2.value);

    const result = await useCase.execute({ userId });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.achievements[0]!.progressPercentage).toBeGreaterThanOrEqual(
        result.value.achievements[1]!.progressPercentage,
      );
    }
  });
});
