import { describe, it, expect } from 'vitest';
import { generateId, right, left } from '@fittrack/core';
import type { DomainError } from '@fittrack/core';
import { AchievementEvaluator } from '../../../../application/services/achievement-evaluator.js';
import { OnWorkoutExecutionCompleted } from '../../../../application/event-handlers/on-workout-execution-completed.js';
import { OnStreakMetricComputed } from '../../../../application/event-handlers/on-streak-metric-computed.js';
import { OnUserCreated } from '../../../../application/event-handlers/on-user-created.js';
import { InMemoryAchievementDefinitionRepository } from '../../../repositories/in-memory-achievement-definition-repository.js';
import { InMemoryUserAchievementProgressRepository } from '../../../repositories/in-memory-user-achievement-progress-repository.js';
import { InMemoryAchievementEventPublisherStub } from '../../../stubs/in-memory-achievement-event-publisher-stub.js';
import {
  FailingAchievementDefinitionRepository,
  FailingUserAchievementProgressRepository,
} from '../../../stubs/failing-repositories.js';
import { makeAchievementDefinition } from '../../../helpers/make-achievement-definition.js';
import type { IUserStatsQueryService } from '../../../../application/services/i-user-stats-query-service.js';
import { DomainError as CoreError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';

class StubError extends CoreError {
  constructor() {
    super('stub error', 'CORE.INTERNAL_ERROR' as ErrorCode);
  }
}

const failingStatsService: IUserStatsQueryService = {
  getWorkoutCount: async () => left(new StubError() as DomainError),
  getCurrentStreakDays: async () => left(new StubError() as DomainError),
  getUserAgeDays: async () => left(new StubError() as DomainError),
};

describe('OnWorkoutExecutionCompleted — error paths', () => {
  it('silently returns when userStatsService fails', async () => {
    const definitionRepo = new InMemoryAchievementDefinitionRepository();
    const progressRepo = new InMemoryUserAchievementProgressRepository();
    const eventPublisher = new InMemoryAchievementEventPublisherStub();
    const evaluator = new AchievementEvaluator(definitionRepo, progressRepo);

    const d = makeAchievementDefinition({ code: 'FIRST_WORKOUT', targetValue: 1, active: true });
    await definitionRepo.save(d);

    const handler = new OnWorkoutExecutionCompleted(evaluator, failingStatsService, eventPublisher);
    // Should not throw
    await handler.handle({
      userId: generateId(),
      professionalProfileId: generateId(),
      executionId: generateId(),
    });
    expect(eventPublisher.unlockedEvents).toHaveLength(0);
  });

  it('silently returns when evaluator fails (repo error)', async () => {
    const eventPublisher = new InMemoryAchievementEventPublisherStub();
    const evaluator = new AchievementEvaluator(
      new FailingAchievementDefinitionRepository(),
      new FailingUserAchievementProgressRepository(),
    );

    const statsOk: IUserStatsQueryService = {
      getWorkoutCount: async () => right(5),
      getCurrentStreakDays: async () => right(0),
      getUserAgeDays: async () => right(0),
    };

    const handler = new OnWorkoutExecutionCompleted(evaluator, statsOk, eventPublisher);
    await handler.handle({
      userId: generateId(),
      professionalProfileId: generateId(),
      executionId: generateId(),
    });
    expect(eventPublisher.unlockedEvents).toHaveLength(0);
  });
});

describe('OnStreakMetricComputed — error paths', () => {
  it('silently returns when evaluator fails', async () => {
    const eventPublisher = new InMemoryAchievementEventPublisherStub();
    const evaluator = new AchievementEvaluator(
      new FailingAchievementDefinitionRepository(),
      new FailingUserAchievementProgressRepository(),
    );
    const handler = new OnStreakMetricComputed(evaluator, eventPublisher);
    await handler.handle({ userId: generateId(), streakDays: 7 });
    expect(eventPublisher.unlockedEvents).toHaveLength(0);
  });
});

describe('OnUserCreated — error paths', () => {
  it('silently returns when definitionRepo.findActive fails', async () => {
    const progressRepo = new InMemoryUserAchievementProgressRepository();
    const handler = new OnUserCreated(new FailingAchievementDefinitionRepository(), progressRepo);
    await handler.handle({ userId: generateId() });
    expect(progressRepo.size).toBe(0);
  });

  it('silently skips when existsByUserAndDefinition fails', async () => {
    const definitionRepo = new InMemoryAchievementDefinitionRepository();
    const d = makeAchievementDefinition({ code: 'FIRST_WORKOUT', active: true });
    await definitionRepo.save(d);

    const handler = new OnUserCreated(
      definitionRepo,
      new FailingUserAchievementProgressRepository(),
    );
    // Should not throw
    await handler.handle({ userId: generateId() });
  });
});
