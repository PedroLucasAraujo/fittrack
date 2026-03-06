import { describe, it, expect } from 'vitest';
import { generateId, left } from '@fittrack/core';
import type { DomainError, Either } from '@fittrack/core';
import { DomainError as CoreDomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AchievementEvaluator } from '../../../../application/services/achievement-evaluator.js';
import { MetricType } from '../../../../domain/value-objects/achievement-metric-type.js';
import { InMemoryAchievementDefinitionRepository } from '../../../repositories/in-memory-achievement-definition-repository.js';
import { InMemoryUserAchievementProgressRepository } from '../../../repositories/in-memory-user-achievement-progress-repository.js';
import {
  FailingAchievementDefinitionRepository,
  FailingUserAchievementProgressRepository,
} from '../../../stubs/failing-repositories.js';
import { makeAchievementDefinition } from '../../../helpers/make-achievement-definition.js';
import type { UserAchievementProgress } from '../../../../domain/aggregates/user-achievement-progress.js';

class StubError extends CoreDomainError {
  constructor() {
    super('stub', 'CORE.INTERNAL_ERROR' as ErrorCode);
  }
}

class SaveFailingProgressRepo extends InMemoryUserAchievementProgressRepository {
  override async save(_: UserAchievementProgress): Promise<Either<DomainError, void>> {
    return left(new StubError() as DomainError);
  }
}

const workoutMetric = () => {
  const r = MetricType.create('workout_count');
  if (r.isLeft()) throw new Error('test helper: metric');
  return r.value;
};

describe('AchievementEvaluator — error paths', () => {
  it('returns Left when definitionRepo.findActiveByMetric fails', async () => {
    const evaluator = new AchievementEvaluator(
      new FailingAchievementDefinitionRepository(),
      new FailingUserAchievementProgressRepository(),
    );
    const result = await evaluator.evaluateForUser(generateId(), workoutMetric(), 1);
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left when progressRepo.findByUserAndDefinition fails', async () => {
    const definitionRepo = new InMemoryAchievementDefinitionRepository();
    const definition = makeAchievementDefinition({
      code: 'FIRST_WORKOUT',
      targetValue: 1,
      active: true,
    });
    await definitionRepo.save(definition);

    const evaluator = new AchievementEvaluator(
      definitionRepo,
      new FailingUserAchievementProgressRepository(),
    );
    const result = await evaluator.evaluateForUser(generateId(), workoutMetric(), 1);
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left when CurrentValue.create(newValue) fails (negative value)', async () => {
    const definitionRepo = new InMemoryAchievementDefinitionRepository();
    const definition = makeAchievementDefinition({
      code: 'FIRST_WORKOUT',
      targetValue: 1,
      active: true,
    });
    await definitionRepo.save(definition);

    const evaluator = new AchievementEvaluator(
      definitionRepo,
      new InMemoryUserAchievementProgressRepository(),
    );
    // newValue = -1 → CurrentValue.create(-1) returns Left
    const result = await evaluator.evaluateForUser(generateId(), workoutMetric(), -1);
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left when progressRepo.save fails', async () => {
    const definitionRepo = new InMemoryAchievementDefinitionRepository();
    const definition = makeAchievementDefinition({
      code: 'FIRST_WORKOUT',
      targetValue: 1,
      active: true,
    });
    await definitionRepo.save(definition);

    const evaluator = new AchievementEvaluator(definitionRepo, new SaveFailingProgressRepo());
    const result = await evaluator.evaluateForUser(generateId(), workoutMetric(), 1);
    expect(result.isLeft()).toBe(true);
  });
});
