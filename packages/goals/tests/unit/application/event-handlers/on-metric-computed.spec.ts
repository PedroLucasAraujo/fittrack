import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateId, left } from '@fittrack/core';
import { GoalNotFoundError } from '../../../../domain/errors/goal-not-found-error.js';
import { OnMetricComputed } from '../../../../application/event-handlers/on-metric-computed.js';
import { UpdateGoalProgress } from '../../../../application/use-cases/update-goal-progress.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { InMemoryGoalsEventPublisher } from '../../../stubs/in-memory-goals-event-publisher.js';
import { makeGoal } from '../../../helpers/make-goal.js';

describe('OnMetricComputed', () => {
  let repo: InMemoryGoalRepository;
  let publisher: InMemoryGoalsEventPublisher;
  let updateGoalProgress: UpdateGoalProgress;
  let handler: OnMetricComputed;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    publisher = new InMemoryGoalsEventPublisher();
    updateGoalProgress = new UpdateGoalProgress(repo, publisher);
    handler = new OnMetricComputed(repo, updateGoalProgress);
  });

  it('updates WEEKLY_VOLUME goals', async () => {
    const clientId = generateId();
    const goal = makeGoal({
      clientId,
      metricType: 'WEEKLY_VOLUME',
      baselineValue: 5000,
      targetValue: 10000,
      unit: 'kg',
    });
    await repo.save(goal);

    await handler.handle({ clientId, metricType: 'WEEKLY_VOLUME', value: 7500 });

    const saved = await repo.findById(goal.id);
    expect(saved!.currentValue).toBe(7500);
    expect(publisher.progressUpdated[0]!.payload.source).toBe('METRIC');
  });

  it('ignores goals for different clients', async () => {
    const clientId = generateId();
    const goal = makeGoal({ clientId: generateId(), metricType: 'WEEKLY_VOLUME' });
    await repo.save(goal);

    await handler.handle({ clientId, metricType: 'WEEKLY_VOLUME', value: 7500 });
    expect(publisher.progressUpdated).toHaveLength(0);
  });

  it('logs error but does not throw when update fails', async () => {
    const clientId = generateId();
    const goal = makeGoal({
      clientId,
      metricType: 'WEEKLY_VOLUME',
      baselineValue: 5000,
      targetValue: 10000,
      unit: 'kg',
    });
    await repo.save(goal);

    vi.spyOn(updateGoalProgress, 'execute').mockResolvedValue(left(new GoalNotFoundError()));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      handler.handle({ clientId, metricType: 'WEEKLY_VOLUME', value: 7500 }),
    ).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
