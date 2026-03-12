import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import { UpdateGoalProgress } from '../../../../application/use-cases/update-goal-progress.js';
import { Goal } from '../../../../domain/aggregates/goal.js';
import { InMemoryGoalRepository } from '../../../repositories/in-memory-goal-repository.js';
import { InMemoryGoalsEventPublisher } from '../../../stubs/in-memory-goals-event-publisher.js';
import { makeGoal } from '../../../helpers/make-goal.js';
import { Milestone } from '../../../../domain/entities/milestone.js';

describe('UpdateGoalProgress', () => {
  let repo: InMemoryGoalRepository;
  let publisher: InMemoryGoalsEventPublisher;
  let useCase: UpdateGoalProgress;

  beforeEach(() => {
    repo = new InMemoryGoalRepository();
    publisher = new InMemoryGoalsEventPublisher();
    useCase = new UpdateGoalProgress(repo, publisher);
  });

  it('updates progress and publishes GoalProgressUpdated (MANUAL by professional)', async () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newValue: 80,
      source: 'MANUAL',
      recordedBy: goal.professionalProfileId,
    });
    expect(result.isRight()).toBe(true);

    const saved = await repo.findById(goal.id);
    expect(saved!.currentValue).toBe(80);
    expect(publisher.progressUpdated).toHaveLength(1);
    expect(publisher.progressUpdated[0]!.payload.currentValue).toBe(80);
  });

  it('allows MANUAL update recorded by the client', async () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newValue: 80,
      source: 'MANUAL',
      recordedBy: goal.clientId,
    });
    expect(result.isRight()).toBe(true);
  });

  it('rejects MANUAL update when recordedBy is not set', async () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newValue: 80,
      source: 'MANUAL',
      // recordedBy omitted — must be rejected
    });
    expect(result.isLeft()).toBe(true);
    expect(publisher.progressUpdated).toHaveLength(0);
  });

  it('rejects MANUAL update when recordedBy is an unauthorized actor', async () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newValue: 80,
      source: 'MANUAL',
      recordedBy: generateId(), // random actor
    });
    expect(result.isLeft()).toBe(true);
    expect(publisher.progressUpdated).toHaveLength(0);
  });

  it('allows ASSESSMENT update without recordedBy (event-driven)', async () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newValue: 80,
      source: 'ASSESSMENT',
    });
    expect(result.isRight()).toBe(true);
  });

  it('publishes GoalProgressRegressed when value worsens', async () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    await repo.save(goal);
    await useCase.execute({
      goalId: goal.id,
      newValue: 80,
      source: 'MANUAL',
      recordedBy: goal.professionalProfileId,
    });
    await useCase.execute({
      goalId: goal.id,
      newValue: 82,
      source: 'MANUAL',
      recordedBy: goal.professionalProfileId,
    });

    expect(publisher.progressRegressed).toHaveLength(1);
  });

  it('publishes GoalMilestoneReached when milestone is crossed', async () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    const ms = Milestone.create({ name: 'Step 1', targetValue: 80, unit: 'kg', order: 1 })
      .value as Milestone;
    goal.addMilestone(ms);
    await repo.save(goal);

    await useCase.execute({
      goalId: goal.id,
      newValue: 79,
      source: 'MANUAL',
      recordedBy: goal.professionalProfileId,
    });
    expect(publisher.milestoneReached).toHaveLength(1);
  });

  it('publishes GoalTargetReached when target is crossed', async () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    await repo.save(goal);

    await useCase.execute({ goalId: goal.id, newValue: 74, source: 'ASSESSMENT' });
    expect(publisher.targetReached).toHaveLength(1);
  });

  it('fails for unknown goal', async () => {
    const result = await useCase.execute({
      goalId: generateId(),
      newValue: 80,
      source: 'MANUAL',
      recordedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails for inactive goal', async () => {
    const goal = makeGoal({ approved: false, started: false });
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newValue: 80,
      source: 'MANUAL',
      recordedBy: goal.professionalProfileId,
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid source', async () => {
    const goal = makeGoal();
    await repo.save(goal);

    const result = await useCase.execute({
      goalId: goal.id,
      newValue: 80,
      source: 'INVALID_SOURCE',
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid goalId', async () => {
    const result = await useCase.execute({
      goalId: 'bad',
      newValue: 80,
      source: 'MANUAL',
      recordedBy: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('publishes GoalOffTrack when goal is behind schedule', async () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);
    const ninetyDaysFromNow = new Date(Date.now() + 90 * 86_400_000);

    const goal = Goal.reconstitute(
      generateId(),
      {
        clientId: generateId(),
        professionalProfileId: generateId(),
        name: 'Off Track Goal',
        description: 'Behind schedule',
        category: 'WEIGHT_LOSS',
        metricType: 'WEIGHT',
        baselineValue: 85,
        targetValue: 75,
        unit: 'kg',
        priority: 'HIGH',
        reason: null,
        targetDate: ninetyDaysFromNow.toISOString().slice(0, 10),
        currentValue: 85,
        progressPercentage: 0,
        lastProgressUpdateAtUtc: null,
        createdAtUtc: UTCDateTime.from(ninetyDaysAgo).value as UTCDateTime,
        approvedAtUtc: UTCDateTime.from(ninetyDaysAgo).value as UTCDateTime,
        startedAtUtc: UTCDateTime.from(ninetyDaysAgo).value as UTCDateTime,
        completedAtUtc: null,
        abandonedAtUtc: null,
        achievedFlag: false,
        updatedAtUtc: UTCDateTime.from(ninetyDaysAgo).value as UTCDateTime,
        progressEntries: [],
        milestones: [],
      },
      1,
    );
    await repo.save(goal);

    // Any new progress value that keeps progress well below expected (~50%)
    await useCase.execute({ goalId: goal.id, newValue: 84, source: 'ASSESSMENT' });
    expect(publisher.offTrack).toHaveLength(1);
  });
});
