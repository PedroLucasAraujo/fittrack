import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { GetGoalProgressHistory } from '../../../../application/use-cases/get-goal-progress-history.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { makeGoal } from '../../../helpers/make-goal.js';
import { makeProgressEntry } from '../../../helpers/make-progress-entry.js';

describe('GetGoalProgressHistory', () => {
  let repo: InMemoryGoalRepository;
  let useCase: GetGoalProgressHistory;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    useCase = new GetGoalProgressHistory(repo);
  });

  it('returns progress entries sorted by recordedAtUtc ASC', async () => {
    const goal = makeGoal();
    goal.recordProgress(makeProgressEntry({ value: 82, source: 'MANUAL' }));
    goal.recordProgress(makeProgressEntry({ value: 80, source: 'ASSESSMENT' }));
    await repo.save(goal);

    const result = await useCase.execute({ goalId: goal.id });
    expect(result.isRight()).toBe(true);
    const entries = result.value as Array<{ value: number }>;
    expect(entries).toHaveLength(2);
  });

  it('returns empty array for goal with no progress entries', async () => {
    const goal = makeGoal();
    await repo.save(goal);

    const result = await useCase.execute({ goalId: goal.id });
    expect((result.value as unknown[]).length).toBe(0);
  });

  it('fails for unknown goal', async () => {
    const result = await useCase.execute({ goalId: generateId() });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid goalId', async () => {
    const result = await useCase.execute({ goalId: 'bad' });
    expect(result.isLeft()).toBe(true);
  });
});
