import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { AchievementEvaluator } from '../../../../application/services/achievement-evaluator.js';
import { OnStreakMetricComputed } from '../../../../application/event-handlers/on-streak-metric-computed.js';
import { InMemoryAchievementDefinitionRepository } from '../../../repositories/in-memory-achievement-definition-repository.js';
import { InMemoryUserAchievementProgressRepository } from '../../../repositories/in-memory-user-achievement-progress-repository.js';
import { InMemoryAchievementEventPublisherStub } from '../../../stubs/in-memory-achievement-event-publisher-stub.js';
import { makeAchievementDefinition } from '../../../helpers/make-achievement-definition.js';

describe('OnStreakMetricComputed', () => {
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

  it('does nothing when there are no active streak achievements', async () => {
    const handler = new OnStreakMetricComputed(evaluator, eventPublisher);
    await handler.handle({ userId: generateId(), streakDays: 7 });
    expect(eventPublisher.unlockedEvents).toHaveLength(0);
  });

  it('unlocks STREAK_7_DAYS when streak reaches 7', async () => {
    const definition = makeAchievementDefinition({
      code: 'STREAK_7_DAYS',
      tier: 'BRONZE',
      category: 'STREAK',
      metric: 'streak_days',
      targetValue: 7,
      active: true,
    });
    await definitionRepo.save(definition);

    const handler = new OnStreakMetricComputed(evaluator, eventPublisher);
    const userId = generateId();
    await handler.handle({ userId, streakDays: 7 });

    expect(eventPublisher.unlockedEvents).toHaveLength(1);
    const evt = eventPublisher.unlockedEvents[0]!;
    expect(evt.payload.achievementCode).toBe('STREAK_7_DAYS');
    expect(evt.payload.userId).toBe(userId);
    expect(evt.payload.achievementTier).toBe('BRONZE');
    expect(evt.payload.achievementCategory).toBe('STREAK');
    expect(evt.tenantId).toBe('');
  });

  it('publishes progress update event for partial streak', async () => {
    const definition = makeAchievementDefinition({
      code: 'STREAK_30_DAYS',
      tier: 'GOLD',
      category: 'STREAK',
      metric: 'streak_days',
      targetValue: 30,
      active: true,
    });
    await definitionRepo.save(definition);

    const handler = new OnStreakMetricComputed(evaluator, eventPublisher);
    await handler.handle({ userId: generateId(), streakDays: 15 });

    expect(eventPublisher.unlockedEvents).toHaveLength(0);
    expect(eventPublisher.progressUpdatedEvents).toHaveLength(1);
    expect(eventPublisher.progressUpdatedEvents[0]!.payload.newValue).toBe(15);
  });

  it('does not unlock when streak is below target', async () => {
    const definition = makeAchievementDefinition({
      code: 'STREAK_30_DAYS',
      metric: 'streak_days',
      targetValue: 30,
      active: true,
    });
    await definitionRepo.save(definition);

    const handler = new OnStreakMetricComputed(evaluator, eventPublisher);
    await handler.handle({ userId: generateId(), streakDays: 15 });

    expect(eventPublisher.unlockedEvents).toHaveLength(0);
    expect(progressRepo.size).toBe(1);
  });

  it('is idempotent — second call with same streak does not re-unlock', async () => {
    const definition = makeAchievementDefinition({
      code: 'STREAK_7_DAYS',
      metric: 'streak_days',
      targetValue: 7,
      active: true,
    });
    await definitionRepo.save(definition);

    const userId = generateId();
    const handler = new OnStreakMetricComputed(evaluator, eventPublisher);
    await handler.handle({ userId, streakDays: 7 });
    await handler.handle({ userId, streakDays: 8 });

    expect(eventPublisher.unlockedEvents).toHaveLength(1);
  });
});
