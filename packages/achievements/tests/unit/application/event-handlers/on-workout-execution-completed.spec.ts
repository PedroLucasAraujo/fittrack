import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { AchievementEvaluator } from '../../../../application/services/achievement-evaluator.js';
import { OnWorkoutExecutionCompleted } from '../../../../application/event-handlers/on-workout-execution-completed.js';
import { InMemoryAchievementDefinitionRepository } from '../../../repositories/in-memory-achievement-definition-repository.js';
import { InMemoryUserAchievementProgressRepository } from '../../../repositories/in-memory-user-achievement-progress-repository.js';
import { InMemoryAchievementEventPublisherStub } from '../../../stubs/in-memory-achievement-event-publisher-stub.js';
import { makeAchievementDefinition } from '../../../helpers/make-achievement-definition.js';
import type { IUserStatsQueryService } from '../../../../application/services/i-user-stats-query-service.js';
import { right } from '@fittrack/core';

function makeUserStatsService(workoutCount: number): IUserStatsQueryService {
  return {
    getWorkoutCount: async (_userId: string) => right(workoutCount),
    getCurrentStreakDays: async (_userId: string) => right(0),
    getUserAgeDays: async (_userId: string) => right(0),
  };
}

describe('OnWorkoutExecutionCompleted', () => {
  let definitionRepo: InMemoryAchievementDefinitionRepository;
  let progressRepo: InMemoryUserAchievementProgressRepository;
  let eventPublisher: InMemoryAchievementEventPublisherStub;
  let evaluator: AchievementEvaluator;

  beforeEach(() => {
    definitionRepo = new InMemoryAchievementDefinitionRepository();
    progressRepo = new InMemoryUserAchievementProgressRepository();
    eventPublisher = new InMemoryAchievementEventPublisherStub();
    evaluator = new AchievementEvaluator(definitionRepo, progressRepo);
  });

  it('does nothing when there are no active workout achievements', async () => {
    const handler = new OnWorkoutExecutionCompleted(
      evaluator,
      makeUserStatsService(1),
      eventPublisher,
    );
    await handler.handle({
      userId: generateId(),
      professionalProfileId: generateId(),
      executionId: generateId(),
    });
    expect(eventPublisher.unlockedEvents).toHaveLength(0);
  });

  it('unlocks FIRST_WORKOUT on first completed workout', async () => {
    const definition = makeAchievementDefinition({
      code: 'FIRST_WORKOUT',
      tier: 'BRONZE',
      category: 'WORKOUT',
      targetValue: 1,
      active: true,
    });
    await definitionRepo.save(definition);

    const handler = new OnWorkoutExecutionCompleted(
      evaluator,
      makeUserStatsService(1),
      eventPublisher,
    );
    const userId = generateId();
    await handler.handle({
      userId,
      professionalProfileId: generateId(),
      executionId: generateId(),
    });

    expect(eventPublisher.unlockedEvents).toHaveLength(1);
    const evt = eventPublisher.unlockedEvents[0]!;
    expect(evt.payload.achievementCode).toBe('FIRST_WORKOUT');
    expect(evt.payload.userId).toBe(userId);
    expect(evt.payload.achievementTier).toBe('BRONZE');
    expect(evt.payload.achievementCategory).toBe('WORKOUT');
    expect(evt.tenantId).toBe('');
  });

  it('publishes progress update event (not unlock) for partial progress', async () => {
    const definition = makeAchievementDefinition({
      code: 'TEN_WORKOUTS',
      tier: 'BRONZE',
      category: 'WORKOUT',
      targetValue: 10,
      active: true,
    });
    await definitionRepo.save(definition);

    const handler = new OnWorkoutExecutionCompleted(
      evaluator,
      makeUserStatsService(5),
      eventPublisher,
    );
    await handler.handle({
      userId: generateId(),
      professionalProfileId: generateId(),
      executionId: generateId(),
    });

    expect(eventPublisher.unlockedEvents).toHaveLength(0);
    expect(eventPublisher.progressUpdatedEvents).toHaveLength(1);
    expect(eventPublisher.progressUpdatedEvents[0]!.payload.newValue).toBe(5);
  });

  it('does not publish unlock event for non-reached achievement', async () => {
    const definition = makeAchievementDefinition({
      code: 'TEN_WORKOUTS',
      targetValue: 10,
      active: true,
    });
    await definitionRepo.save(definition);

    const handler = new OnWorkoutExecutionCompleted(
      evaluator,
      makeUserStatsService(5),
      eventPublisher,
    );
    await handler.handle({
      userId: generateId(),
      professionalProfileId: generateId(),
      executionId: generateId(),
    });

    expect(eventPublisher.unlockedEvents).toHaveLength(0);
    expect(progressRepo.size).toBe(1);
  });

  it('unlocks multiple achievements in one event when threshold is met', async () => {
    const d1 = makeAchievementDefinition({ code: 'FIRST_WORKOUT', targetValue: 1, active: true });
    const d2 = makeAchievementDefinition({ code: 'TEN_WORKOUTS', targetValue: 10, active: true });
    await definitionRepo.save(d1);
    await definitionRepo.save(d2);

    const handler = new OnWorkoutExecutionCompleted(
      evaluator,
      makeUserStatsService(10),
      eventPublisher,
    );
    await handler.handle({
      userId: generateId(),
      professionalProfileId: generateId(),
      executionId: generateId(),
    });

    expect(eventPublisher.unlockedEvents).toHaveLength(2);
  });

  it('is idempotent — does not re-unlock already unlocked achievements', async () => {
    const definition = makeAchievementDefinition({
      code: 'FIRST_WORKOUT',
      targetValue: 1,
      active: true,
    });
    await definitionRepo.save(definition);

    const userId = generateId();
    const userStats = makeUserStatsService(1);
    const handler = new OnWorkoutExecutionCompleted(evaluator, userStats, eventPublisher);

    await handler.handle({
      userId,
      professionalProfileId: generateId(),
      executionId: generateId(),
    });
    await handler.handle({
      userId,
      professionalProfileId: generateId(),
      executionId: generateId(),
    });

    // Only 1 unlock event total (second call is skipped)
    expect(eventPublisher.unlockedEvents).toHaveLength(1);
  });
});
