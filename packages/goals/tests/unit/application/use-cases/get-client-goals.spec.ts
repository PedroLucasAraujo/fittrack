import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { GetClientGoals } from '../../../../application/use-cases/get-client-goals.js';
import { Milestone } from '../../../../domain/entities/milestone.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { makeGoal } from '../../../helpers/make-goal.js';
import { makeProgressEntry } from '../../../helpers/make-progress-entry.js';

describe('GetClientGoals', () => {
  let repo: InMemoryGoalRepository;
  let useCase: GetClientGoals;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    useCase = new GetClientGoals(repo);
  });

  it('returns all goals for a client', async () => {
    const clientId = generateId();
    await repo.save(makeGoal({ clientId }));
    await repo.save(makeGoal({ clientId }));
    await repo.save(makeGoal({ clientId: generateId() })); // different client

    const result = await useCase.execute({ clientId, status: 'ALL' });
    expect(result.isRight()).toBe(true);
    expect((result.value as unknown[]).length).toBe(2);
  });

  it('filters by status ACTIVE', async () => {
    const clientId = generateId();
    await repo.save(makeGoal({ clientId, approved: true, started: true })); // ACTIVE
    const draftGoal = makeGoal({ clientId, approved: false, started: false });
    await repo.save(draftGoal);

    const result = await useCase.execute({ clientId, status: 'ACTIVE' });
    expect(result.isRight()).toBe(true);
    expect((result.value as unknown[]).length).toBe(1);
  });

  it('filters by status DRAFT', async () => {
    const clientId = generateId();
    await repo.save(makeGoal({ clientId, approved: false, started: false }));
    await repo.save(makeGoal({ clientId, approved: true, started: true }));

    const result = await useCase.execute({ clientId, status: 'DRAFT' });
    expect((result.value as unknown[]).length).toBe(1);
  });

  it('returns goals sorted by priority (HIGH first)', async () => {
    const clientId = generateId();
    await repo.save(makeGoal({ clientId, priority: 'LOW' }));
    await repo.save(makeGoal({ clientId, priority: 'HIGH' }));
    await repo.save(makeGoal({ clientId, priority: 'MEDIUM' }));

    const result = await useCase.execute({ clientId, status: 'ALL' });
    const goals = result.value as Array<{ priority: string }>;
    expect(goals[0]!.priority).toBe('HIGH');
    expect(goals[1]!.priority).toBe('MEDIUM');
    expect(goals[2]!.priority).toBe('LOW');
  });

  it('returns empty array for unknown client', async () => {
    const result = await useCase.execute({ clientId: generateId() });
    expect(result.isRight()).toBe(true);
    expect((result.value as unknown[]).length).toBe(0);
  });

  it('rejects invalid clientId', async () => {
    const result = await useCase.execute({ clientId: 'bad-uuid' });
    expect(result.isLeft()).toBe(true);
  });

  it('includes milestone progress in DTO', async () => {
    const clientId = generateId();
    const goal = makeGoal({ clientId });
    await repo.save(goal);

    const result = await useCase.execute({ clientId });
    const dto = (
      result.value as Array<{ milestoneProgress: { reached: number; total: number } }>
    )[0]!;
    expect(dto.milestoneProgress).toEqual({ reached: 0, total: 0 });
  });

  it('filters by status COMPLETED', async () => {
    const clientId = generateId();
    const profId = generateId();
    const goal = makeGoal({ clientId, professionalProfileId: profId });
    goal.complete(true);
    await repo.save(goal);
    await repo.save(makeGoal({ clientId })); // ACTIVE goal

    const result = await useCase.execute({ clientId, status: 'COMPLETED' });
    expect((result.value as unknown[]).length).toBe(1);
    expect((result.value as Array<{ status: string }>)[0]!.status).toBe('COMPLETED');
  });

  it('filters by status ABANDONED', async () => {
    const clientId = generateId();
    const goal = makeGoal({ clientId });
    goal.abandon('No longer relevant');
    await repo.save(goal);
    await repo.save(makeGoal({ clientId })); // ACTIVE goal

    const result = await useCase.execute({ clientId, status: 'ABANDONED' });
    expect((result.value as unknown[]).length).toBe(1);
    expect((result.value as Array<{ status: string }>)[0]!.status).toBe('ABANDONED');
  });

  it('maps milestones in DTO including reached milestone with reachedAtUtc', async () => {
    const clientId = generateId();
    const goal = makeGoal({ clientId, baselineValue: 85, targetValue: 75 });

    const ms = Milestone.create({ name: 'Step 1', targetValue: 80, unit: 'kg', order: 1 })
      .value as Milestone;
    goal.addMilestone(ms);
    // Reach the milestone
    goal.recordProgress(makeProgressEntry({ value: 79, unit: 'kg' }));
    await repo.save(goal);

    const result = await useCase.execute({ clientId });
    const dto = (
      result.value as Array<{
        milestones: Array<{ isReached: boolean; reachedAtUtc: string | null }>;
      }>
    )[0]!;
    expect(dto.milestones).toHaveLength(1);
    expect(dto.milestones[0]!.isReached).toBe(true);
    expect(dto.milestones[0]!.reachedAtUtc).not.toBeNull();
  });

  it('maps milestones in DTO with null reachedAtUtc when not reached', async () => {
    const clientId = generateId();
    const goal = makeGoal({ clientId, baselineValue: 85, targetValue: 75 });
    const ms = Milestone.create({ name: 'Not reached', targetValue: 80, unit: 'kg', order: 1 })
      .value as Milestone;
    goal.addMilestone(ms);
    await repo.save(goal);

    const result = await useCase.execute({ clientId });
    const dto = (
      result.value as Array<{
        milestones: Array<{ isReached: boolean; reachedAtUtc: string | null }>;
      }>
    )[0]!;
    expect(dto.milestones[0]!.isReached).toBe(false);
    expect(dto.milestones[0]!.reachedAtUtc).toBeNull();
  });
});
