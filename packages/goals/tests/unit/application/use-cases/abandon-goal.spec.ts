import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { AbandonGoal } from '../../../../application/use-cases/abandon-goal.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { InMemoryGoalsEventPublisher } from '../../../stubs/in-memory-goals-event-publisher.js';
import { makeGoal } from '../../../helpers/make-goal.js';

describe('AbandonGoal', () => {
  let repo: InMemoryGoalRepository;
  let publisher: InMemoryGoalsEventPublisher;
  let useCase: AbandonGoal;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    publisher = new InMemoryGoalsEventPublisher();
    useCase = new AbandonGoal(repo, publisher);
  });

  it('abandons an active goal when called by the client and publishes GoalAbandoned', async () => {
    const goal = makeGoal();
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      reason: 'Changed priorities',
      abandonedBy: goal.clientId,
    });
    expect(result.isRight()).toBe(true);

    const saved = await repo.findById(goal.id);
    expect(saved!.isAbandoned()).toBe(true);
    expect(publisher.abandoned).toHaveLength(1);
    expect(publisher.abandoned[0]!.payload.reason).toBe('Changed priorities');
  });

  it('abandons an active goal when called by the professional', async () => {
    const goal = makeGoal();
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      reason: 'Clinical decision',
      abandonedBy: goal.professionalProfileId,
    });
    expect(result.isRight()).toBe(true);
    expect(publisher.abandoned).toHaveLength(1);
  });

  it('rejects when abandonedBy is neither client nor professional', async () => {
    const goal = makeGoal();
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      reason: 'unauthorized',
      abandonedBy: generateId(), // random actor — must be rejected
    });
    expect(result.isLeft()).toBe(true);
    expect(publisher.abandoned).toHaveLength(0);
  });

  it('fails for unknown goal', async () => {
    const result = await useCase.execute({
      goalId: generateId(),
      reason: 'reason',
      abandonedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails for completed goal', async () => {
    const goal = makeGoal();
    goal.complete(false);
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      reason: 'reason',
      abandonedBy: goal.clientId,
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid goalId UUID', async () => {
    const result = await useCase.execute({
      goalId: 'not-a-uuid',
      reason: 'reason',
      abandonedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });
});
