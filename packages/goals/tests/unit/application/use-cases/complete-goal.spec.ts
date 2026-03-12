import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CompleteGoal } from '../../../../application/use-cases/complete-goal.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { InMemoryGoalsEventPublisher } from '../../../stubs/in-memory-goals-event-publisher.js';
import { makeGoal } from '../../../helpers/make-goal.js';

describe('CompleteGoal', () => {
  let repo: InMemoryGoalRepository;
  let publisher: InMemoryGoalsEventPublisher;
  let useCase: CompleteGoal;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    publisher = new InMemoryGoalsEventPublisher();
    useCase = new CompleteGoal(repo, publisher);
  });

  it('completes with achieved=true and publishes GoalAchieved', async () => {
    const profId = generateId();
    const goal = makeGoal({ professionalProfileId: profId });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      achieved: true,
      completedBy: profId,
    });
    expect(result.isRight()).toBe(true);
    expect(publisher.achieved).toHaveLength(1);
    expect(publisher.notAchieved).toHaveLength(0);
  });

  it('completes with achieved=false and publishes GoalNotAchieved', async () => {
    const profId = generateId();
    const goal = makeGoal({ professionalProfileId: profId });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      achieved: false,
      completedBy: profId,
    });
    expect(result.isRight()).toBe(true);
    expect(publisher.notAchieved).toHaveLength(1);
    expect(publisher.achieved).toHaveLength(0);
  });

  it('rejects unauthorized professional', async () => {
    const goal = makeGoal();
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      achieved: false,
      completedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails for unknown goal', async () => {
    const result = await useCase.execute({
      goalId: generateId(),
      achieved: false,
      completedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails for inactive goal', async () => {
    const profId = generateId();
    const goal = makeGoal({ professionalProfileId: profId, approved: false, started: false });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      achieved: false,
      completedBy: profId,
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid goalId UUID', async () => {
    const result = await useCase.execute({
      goalId: 'not-a-uuid',
      achieved: false,
      completedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });
});
