import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ApproveGoal } from '../../../../application/use-cases/approve-goal.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { InMemoryGoalsEventPublisher } from '../../../stubs/in-memory-goals-event-publisher.js';
import { makeGoal } from '../../../helpers/make-goal.js';

describe('ApproveGoal', () => {
  let repo: InMemoryGoalRepository;
  let publisher: InMemoryGoalsEventPublisher;
  let useCase: ApproveGoal;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    publisher = new InMemoryGoalsEventPublisher();
    useCase = new ApproveGoal(repo, publisher);
  });

  it('approves a draft goal and starts it', async () => {
    const profId = generateId();
    const goal = makeGoal({ professionalProfileId: profId, approved: false, started: false });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      professionalProfileId: profId,
    });
    expect(result.isRight()).toBe(true);

    const saved = await repo.findById(goal.id);
    expect(saved!.isActive()).toBe(true);
    expect(publisher.approved).toHaveLength(1);
    expect(publisher.started).toHaveLength(1);
  });

  it('fails for unknown goal', async () => {
    const result = await useCase.execute({
      goalId: generateId(),
      professionalProfileId: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects unauthorized professional', async () => {
    const goal = makeGoal({ approved: false, started: false });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      professionalProfileId: generateId(), // different professional
    });
    expect(result.isLeft()).toBe(true);
    expect((result.value as { message: string }).message).toContain('authorized');
  });

  it('fails when goal is already approved', async () => {
    const profId = generateId();
    const goal = makeGoal({ professionalProfileId: profId, approved: true, started: false });
    await repo.save(goal);

    const result = await useCase.execute({ goalId: goal.id, professionalProfileId: profId });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid goalId format', async () => {
    const result = await useCase.execute({
      goalId: 'not-a-uuid',
      professionalProfileId: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });
});
