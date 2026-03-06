import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { AchievementEvaluator } from '../../../../application/services/achievement-evaluator.js';
import { MetricType } from '../../../../domain/value-objects/achievement-metric-type.js';
import { InMemoryAchievementDefinitionRepository } from '../../../repositories/in-memory-achievement-definition-repository.js';
import { InMemoryUserAchievementProgressRepository } from '../../../repositories/in-memory-user-achievement-progress-repository.js';
import { makeAchievementDefinition } from '../../../helpers/make-achievement-definition.js';

describe('AchievementEvaluator', () => {
  let definitionRepo: InMemoryAchievementDefinitionRepository;
  let progressRepo: InMemoryUserAchievementProgressRepository;
  let evaluator: AchievementEvaluator;

  beforeEach(() => {
    definitionRepo = new InMemoryAchievementDefinitionRepository();
    progressRepo = new InMemoryUserAchievementProgressRepository();
    evaluator = new AchievementEvaluator(definitionRepo, progressRepo);
  });

  const getMetric = (type: string) => {
    const r = MetricType.create(type);
    if (r.isLeft()) throw new Error('invalid metric type in test');
    return r.value;
  };

  it('returns empty array when no active definitions match the metric', async () => {
    const userId = generateId();
    const metric = getMetric('workout_count');

    const result = await evaluator.evaluateForUser(userId, metric, 5);
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('creates new progress record when none exists and updates it', async () => {
    const userId = generateId();
    const definition = makeAchievementDefinition({
      code: 'FIRST_WORKOUT',
      targetValue: 1,
      active: true,
    });
    await definitionRepo.save(definition);

    const metric = getMetric('workout_count');
    const result = await evaluator.evaluateForUser(userId, metric, 1);

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.wasUnlocked).toBe(true);
      expect(result.value[0]!.progress.isUnlocked()).toBe(true);
      expect(result.value[0]!.progress.currentValue.value).toBe(1);
    }

    // progress was persisted
    expect(progressRepo.size).toBe(1);
  });

  it('unlocks achievement when target is reached', async () => {
    const userId = generateId();
    const definition = makeAchievementDefinition({
      code: 'TEN_WORKOUTS',
      targetValue: 10,
      active: true,
    });
    await definitionRepo.save(definition);

    const metric = getMetric('workout_count');
    const result = await evaluator.evaluateForUser(userId, metric, 10);

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value[0]!.wasUnlocked).toBe(true);
    }
  });

  it('does not unlock when below target', async () => {
    const userId = generateId();
    const definition = makeAchievementDefinition({
      code: 'TEN_WORKOUTS',
      targetValue: 10,
      active: true,
    });
    await definitionRepo.save(definition);

    const metric = getMetric('workout_count');
    const result = await evaluator.evaluateForUser(userId, metric, 5);

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value[0]!.wasUnlocked).toBe(false);
      expect(result.value[0]!.progress.isUnlocked()).toBe(false);
    }
  });

  it('skips already unlocked achievements (idempotent)', async () => {
    const userId = generateId();
    const definition = makeAchievementDefinition({
      code: 'FIRST_WORKOUT',
      targetValue: 1,
      active: true,
    });
    await definitionRepo.save(definition);

    const metric = getMetric('workout_count');

    // First unlock
    await evaluator.evaluateForUser(userId, metric, 1);

    // Second call — should skip unlock
    const result = await evaluator.evaluateForUser(userId, metric, 2);
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value[0]!.wasUnlocked).toBe(false);
    }
  });

  it('evaluates multiple achievements for the same metric', async () => {
    const userId = generateId();
    const d1 = makeAchievementDefinition({ code: 'FIRST_WORKOUT', targetValue: 1, active: true });
    const d2 = makeAchievementDefinition({ code: 'TEN_WORKOUTS', targetValue: 10, active: true });
    await definitionRepo.save(d1);
    await definitionRepo.save(d2);

    const metric = getMetric('workout_count');
    const result = await evaluator.evaluateForUser(userId, metric, 10);

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toHaveLength(2);
      expect(result.value.every((r) => r.wasUnlocked)).toBe(true);
    }
  });

  it('does not update progress when newValue is same as existing', async () => {
    const userId = generateId();
    const definition = makeAchievementDefinition({
      code: 'TEN_WORKOUTS',
      targetValue: 10,
      active: true,
    });
    await definitionRepo.save(definition);

    const metric = getMetric('workout_count');

    // First call sets currentValue to 5
    await evaluator.evaluateForUser(userId, metric, 5);

    // Second call with same value
    const result = await evaluator.evaluateForUser(userId, metric, 5);
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value[0]!.progress.currentValue.value).toBe(5);
      expect(result.value[0]!.wasProgressUpdated).toBe(false);
    }
  });

  it('sets wasProgressUpdated=true when progress increases without unlock', async () => {
    const userId = generateId();
    const definition = makeAchievementDefinition({
      code: 'TEN_WORKOUTS',
      targetValue: 10,
      active: true,
    });
    await definitionRepo.save(definition);

    const metric = getMetric('workout_count');
    const result = await evaluator.evaluateForUser(userId, metric, 5);

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value[0]!.wasProgressUpdated).toBe(true);
      expect(result.value[0]!.wasUnlocked).toBe(false);
      expect(result.value[0]!.oldValue).toBe(0);
      expect(result.value[0]!.newValue).toBe(5);
    }
  });

  it('only evaluates definitions matching the given metric', async () => {
    const userId = generateId();
    const workoutDef = makeAchievementDefinition({
      code: 'FIRST_WORKOUT',
      metric: 'workout_count',
      targetValue: 1,
      active: true,
    });
    const streakDef = makeAchievementDefinition({
      code: 'STREAK_7_DAYS',
      metric: 'streak_days',
      targetValue: 7,
      active: true,
    });
    await definitionRepo.save(workoutDef);
    await definitionRepo.save(streakDef);

    const workoutMetric = getMetric('workout_count');
    const result = await evaluator.evaluateForUser(userId, workoutMetric, 1);

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      // Only workout achievements evaluated — streak not touched
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.progress.achievementCode).toBe('FIRST_WORKOUT');
    }
  });
});
