import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateId, left } from '@fittrack/core';
import { GoalNotFoundError } from '../../../../domain/errors/goal-not-found-error.js';
import { OnStreakIncremented } from '../../../../application/event-handlers/on-streak-incremented.js';
import { UpdateGoalProgress } from '../../../../application/use-cases/update-goal-progress.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { InMemoryGoalsEventPublisher } from '../../../stubs/in-memory-goals-event-publisher.js';
import { makeGoal } from '../../../helpers/make-goal.js';

describe('OnStreakIncremented', () => {
  let repo: InMemoryGoalRepository;
  let publisher: InMemoryGoalsEventPublisher;
  let updateGoalProgress: UpdateGoalProgress;
  let handler: OnStreakIncremented;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    publisher = new InMemoryGoalsEventPublisher();
    updateGoalProgress = new UpdateGoalProgress(repo, publisher);
    handler = new OnStreakIncremented(repo, updateGoalProgress);
  });

  it('updates STREAK_DAYS goals with current streak value', async () => {
    const userId = generateId();
    const goal = makeGoal({
      clientId: userId,
      metricType: 'STREAK_DAYS',
      baselineValue: 0,
      targetValue: 30,
      unit: 'days',
    });
    await repo.save(goal);

    await handler.handle({ userId, currentStreak: 15 });

    const saved = await repo.findById(goal.id);
    expect(saved!.currentValue).toBe(15);
    expect(publisher.progressUpdated[0]!.payload.source).toBe('METRIC');
  });

  it('skips goals for different users', async () => {
    const goal = makeGoal({ clientId: generateId(), metricType: 'STREAK_DAYS' });
    await repo.save(goal);

    await handler.handle({ userId: generateId(), currentStreak: 10 });
    expect(publisher.progressUpdated).toHaveLength(0);
  });

  it('logs error but does not throw when update fails', async () => {
    const userId = generateId();
    const goal = makeGoal({
      clientId: userId,
      metricType: 'STREAK_DAYS',
      baselineValue: 0,
      targetValue: 30,
      unit: 'days',
    });
    await repo.save(goal);

    vi.spyOn(updateGoalProgress, 'execute').mockResolvedValue(left(new GoalNotFoundError()));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(handler.handle({ userId, currentStreak: 5 })).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
