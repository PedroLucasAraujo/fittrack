import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { AddMilestone } from '../../../../application/use-cases/add-milestone.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { InMemoryGoalsEventPublisher } from '../../../stubs/in-memory-goals-event-publisher.js';
import { makeGoal } from '../../../helpers/make-goal.js';

describe('AddMilestone', () => {
  let repo: InMemoryGoalRepository;
  let publisher: InMemoryGoalsEventPublisher;
  let useCase: AddMilestone;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    publisher = new InMemoryGoalsEventPublisher();
    useCase = new AddMilestone(repo, publisher);
  });

  it('adds a milestone to an active goal and publishes GoalMilestoneAdded', async () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      milestoneName: 'First step',
      milestoneTargetValue: 80,
      addedBy: goal.professionalProfileId,
    });
    expect(result.isRight()).toBe(true);
    const output = result.value as { milestoneId: string };
    expect(output.milestoneId).toBeTruthy();

    const saved = await repo.findById(goal.id);
    expect(saved!.milestones).toHaveLength(1);
    expect(publisher.milestoneAdded).toHaveLength(1);
    expect(publisher.milestoneAdded[0]!.payload.milestoneName).toBe('First step');
  });

  it('rejects when addedBy is not the owning professional', async () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      milestoneName: 'Unauthorized step',
      milestoneTargetValue: 80,
      addedBy: generateId(), // not the owner
    });
    expect(result.isLeft()).toBe(true);
    expect(publisher.milestoneAdded).toHaveLength(0);
  });

  it('rejects milestone outside goal range', async () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      milestoneName: 'Out of range',
      milestoneTargetValue: 90, // above baseline
      addedBy: goal.professionalProfileId,
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails for unknown goal', async () => {
    const result = await useCase.execute({
      goalId: generateId(),
      milestoneName: 'Step',
      milestoneTargetValue: 80,
      addedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid milestone name', async () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      milestoneName: 'X', // too short
      milestoneTargetValue: 80,
      addedBy: goal.professionalProfileId,
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid goalId UUID', async () => {
    const result = await useCase.execute({
      goalId: 'not-a-uuid',
      milestoneName: 'Step',
      milestoneTargetValue: 80,
      addedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });
});
