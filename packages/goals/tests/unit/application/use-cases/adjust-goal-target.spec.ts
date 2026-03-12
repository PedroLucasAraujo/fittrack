import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { AdjustGoalTarget } from '../../../../application/use-cases/adjust-goal-target.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { InMemoryGoalsEventPublisher } from '../../../stubs/in-memory-goals-event-publisher.js';
import { makeGoal } from '../../../helpers/make-goal.js';

describe('AdjustGoalTarget', () => {
  let repo: InMemoryGoalRepository;
  let publisher: InMemoryGoalsEventPublisher;
  let useCase: AdjustGoalTarget;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    publisher = new InMemoryGoalsEventPublisher();
    useCase = new AdjustGoalTarget(repo, publisher);
  });

  it('adjusts target and publishes GoalTargetAdjusted', async () => {
    const profId = generateId();
    const goal = makeGoal({ professionalProfileId: profId, baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newTargetValue: 70,
      reason: 'Increased ambition',
      adjustedBy: profId,
    });
    expect(result.isRight()).toBe(true);

    const saved = await repo.findById(goal.id);
    expect(saved!.targetValue).toBe(70);
    expect(publisher.targetAdjusted).toHaveLength(1);
    expect(publisher.targetAdjusted[0]!.payload.oldTarget).toBe(75);
    expect(publisher.targetAdjusted[0]!.payload.newTarget).toBe(70);
  });

  it('rejects unauthorized professional', async () => {
    const goal = makeGoal();
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newTargetValue: 70,
      reason: 'reason',
      adjustedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails for inactive goal', async () => {
    const profId = generateId();
    const goal = makeGoal({ professionalProfileId: profId, approved: false, started: false });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newTargetValue: 70,
      reason: 'reason',
      adjustedBy: profId,
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid goalId UUID', async () => {
    const result = await useCase.execute({
      goalId: 'not-a-uuid',
      newTargetValue: 70,
      reason: 'reason',
      adjustedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails for unknown goal', async () => {
    const result = await useCase.execute({
      goalId: generateId(),
      newTargetValue: 70,
      reason: 'reason',
      adjustedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });
});
