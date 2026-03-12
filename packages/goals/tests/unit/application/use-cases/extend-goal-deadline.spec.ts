import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ExtendGoalDeadline } from '../../../../application/use-cases/extend-goal-deadline.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { InMemoryGoalsEventPublisher } from '../../../stubs/in-memory-goals-event-publisher.js';
import { makeGoal } from '../../../helpers/make-goal.js';

describe('ExtendGoalDeadline', () => {
  let repo: InMemoryGoalRepository;
  let publisher: InMemoryGoalsEventPublisher;
  let useCase: ExtendGoalDeadline;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    publisher = new InMemoryGoalsEventPublisher();
    useCase = new ExtendGoalDeadline(repo, publisher);
  });

  it('extends the deadline and publishes GoalDeadlineExtended', async () => {
    const goal = makeGoal({ targetDate: '2099-06-01' });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newTargetDate: '2099-12-31',
      reason: 'Need more time',
      extendedBy: goal.professionalProfileId,
    });
    expect(result.isRight()).toBe(true);

    const saved = await repo.findById(goal.id);
    expect(saved!.targetDate).toBe('2099-12-31');
    expect(publisher.deadlineExtended).toHaveLength(1);
    expect(publisher.deadlineExtended[0]!.payload.oldDeadline).toBe('2099-06-01');
  });

  it('rejects when extendedBy is not the owning professional', async () => {
    const goal = makeGoal({ targetDate: '2099-06-01' });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newTargetDate: '2099-12-31',
      reason: 'reason',
      extendedBy: generateId(), // not the owner
    });
    expect(result.isLeft()).toBe(true);
    expect(publisher.deadlineExtended).toHaveLength(0);
  });

  it('rejects when new date is not after current date', async () => {
    const goal = makeGoal({ targetDate: '2099-12-31' });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newTargetDate: '2099-06-01',
      reason: 'Move it earlier',
      extendedBy: goal.professionalProfileId,
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid date format', async () => {
    const goal = makeGoal();
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newTargetDate: '31/12/2099',
      reason: 'bad format',
      extendedBy: goal.professionalProfileId,
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails for unknown goal', async () => {
    const result = await useCase.execute({
      goalId: generateId(),
      newTargetDate: '2099-12-31',
      reason: 'reason',
      extendedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects past date', async () => {
    const goal = makeGoal();
    await repo.save(goal);
    const result = await useCase.execute({
      goalId: goal.id,
      newTargetDate: '2020-01-01',
      reason: 'past',
      extendedBy: goal.professionalProfileId,
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid goalId UUID', async () => {
    const result = await useCase.execute({
      goalId: 'not-a-uuid',
      newTargetDate: '2099-12-31',
      reason: 'reason',
      extendedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails for inactive (completed) goal', async () => {
    const goal = makeGoal();
    goal.complete(false);
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newTargetDate: '2099-12-31',
      reason: 'reason',
      extendedBy: goal.professionalProfileId,
    });
    expect(result.isLeft()).toBe(true);
  });
});
