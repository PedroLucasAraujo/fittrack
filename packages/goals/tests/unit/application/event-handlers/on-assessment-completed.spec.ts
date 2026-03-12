import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateId, left } from '@fittrack/core';
import { GoalNotFoundError } from '../../../../domain/errors/goal-not-found-error.js';
import { OnAssessmentCompleted } from '../../../../application/event-handlers/on-assessment-completed.js';
import { UpdateGoalProgress } from '../../../../application/use-cases/update-goal-progress.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { InMemoryGoalsEventPublisher } from '../../../stubs/in-memory-goals-event-publisher.js';
import { makeGoal } from '../../../helpers/make-goal.js';

describe('OnAssessmentCompleted', () => {
  let repo: InMemoryGoalRepository;
  let publisher: InMemoryGoalsEventPublisher;
  let updateGoalProgress: UpdateGoalProgress;
  let handler: OnAssessmentCompleted;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    publisher = new InMemoryGoalsEventPublisher();
    updateGoalProgress = new UpdateGoalProgress(repo, publisher);
    handler = new OnAssessmentCompleted(repo, updateGoalProgress);
  });

  it('updates active WEIGHT goals for the client', async () => {
    const clientId = generateId();
    const goal = makeGoal({ clientId, metricType: 'WEIGHT', baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    await handler.handle({ clientId, weightKg: 82, bodyFatPercentage: null });

    const saved = await repo.findById(goal.id);
    expect(saved!.currentValue).toBe(82);
    expect(publisher.progressUpdated).toHaveLength(1);
    expect(publisher.progressUpdated[0]!.payload.source).toBe('ASSESSMENT');
  });

  it('updates active BODY_FAT goals for the client', async () => {
    const clientId = generateId();
    const goal = makeGoal({
      clientId,
      metricType: 'BODY_FAT',
      baselineValue: 25,
      targetValue: 18,
      unit: '%',
    });
    await repo.save(goal);

    await handler.handle({ clientId, weightKg: null, bodyFatPercentage: 22 });

    const saved = await repo.findById(goal.id);
    expect(saved!.currentValue).toBe(22);
  });

  it('skips null metric values', async () => {
    const clientId = generateId();
    const goal = makeGoal({ clientId, metricType: 'WEIGHT' });
    await repo.save(goal);

    await handler.handle({ clientId, weightKg: null, bodyFatPercentage: null });

    expect(publisher.progressUpdated).toHaveLength(0);
  });

  it('does not update goals for different client', async () => {
    const clientId = generateId();
    const otherClientId = generateId();
    const goal = makeGoal({ clientId: otherClientId, metricType: 'WEIGHT' });
    await repo.save(goal);

    await handler.handle({ clientId, weightKg: 80, bodyFatPercentage: null });
    expect(publisher.progressUpdated).toHaveLength(0);
  });

  it('logs error but does not throw when update fails', async () => {
    const clientId = generateId();
    const goal = makeGoal({ clientId, metricType: 'WEIGHT', baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    vi.spyOn(updateGoalProgress, 'execute').mockResolvedValue(left(new GoalNotFoundError()));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      handler.handle({ clientId, weightKg: 82, bodyFatPercentage: null }),
    ).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
