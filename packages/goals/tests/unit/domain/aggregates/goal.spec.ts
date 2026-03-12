import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import { Goal } from '../../../../domain/aggregates/goal.js';
import { Milestone } from '../../../../domain/entities/milestone.js';
import { makeGoal } from '../../../helpers/make-goal.js';
import { makeProgressEntry } from '../../../helpers/make-progress-entry.js';

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Goal.create() ─────────────────────────────────────────────────────────────

describe('Goal.create()', () => {
  it('creates a goal in DRAFT state', () => {
    const result = Goal.create({
      clientId: generateId(),
      professionalProfileId: generateId(),
      name: 'Lose weight',
      description: 'Lose 10kg',
      category: 'WEIGHT_LOSS',
      metricType: 'WEIGHT',
      baselineValue: 85,
      targetValue: 75,
      unit: 'kg',
      priority: 'HIGH',
      reason: null,
      targetDate: null,
    });
    expect(result.isRight()).toBe(true);
    const goal = result.value as Goal;
    expect(goal.isDraft()).toBe(true);
    expect(goal.isActive()).toBe(false);
    expect(goal.isCompleted()).toBe(false);
    expect(goal.isAbandoned()).toBe(false);
    expect(goal.progressPercentage).toBe(0);
    expect(goal.currentValue).toBe(85); // initialized to baseline
  });

  it('rejects when baselineValue equals targetValue', () => {
    const result = Goal.create({
      clientId: generateId(),
      professionalProfileId: generateId(),
      name: 'Test',
      description: 'Test',
      category: 'WEIGHT_LOSS',
      metricType: 'WEIGHT',
      baselineValue: 80,
      targetValue: 80,
      unit: 'kg',
      priority: 'MEDIUM',
      reason: null,
      targetDate: null,
    });
    expect(result.isLeft()).toBe(true);
  });
});

// ── Goal.approve() ────────────────────────────────────────────────────────────

describe('Goal.approve()', () => {
  it('transitions DRAFT → approved, sets approvedAtUtc', () => {
    const goal = makeGoal({ approved: false, started: false });
    expect(goal.isDraft()).toBe(true);
    const result = goal.approve();
    expect(result.isRight()).toBe(true);
    expect(goal.approvedAtUtc).not.toBeNull();
    expect(goal.isDraft()).toBe(false);
  });

  it('fails if already approved', () => {
    const goal = makeGoal({ approved: true, started: false });
    const result = goal.approve();
    expect(result.isLeft()).toBe(true);
    expect((result.value as { message: string }).message).toContain('already been approved');
  });
});

// ── Goal.start() ──────────────────────────────────────────────────────────────

describe('Goal.start()', () => {
  it('transitions approved → active, sets startedAtUtc and initializes progress', () => {
    const goal = makeGoal({ approved: true, started: false });
    expect(goal.startedAtUtc).toBeNull();
    const result = goal.start();
    expect(result.isRight()).toBe(true);
    expect(goal.startedAtUtc).not.toBeNull();
    expect(goal.currentValue).toBe(goal.baselineValue);
    expect(goal.progressPercentage).toBe(0);
    expect(goal.isActive()).toBe(true);
  });

  it('fails if not approved', () => {
    const goal = makeGoal({ approved: false, started: false });
    const result = goal.start();
    expect(result.isLeft()).toBe(true);
    expect((result.value as { message: string }).message).toContain('approved');
  });

  it('fails if already started', () => {
    const goal = makeGoal({ approved: true, started: true });
    const result = goal.start();
    expect(result.isLeft()).toBe(true);
  });
});

// ── Goal.recordProgress() ─────────────────────────────────────────────────────

describe('Goal.recordProgress()', () => {
  it('adds a progress entry and updates snapshot (decreasing goal)', () => {
    // baseline=85, target=75, new=80 → 50%
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    const entry = makeProgressEntry({ value: 80, unit: 'kg' });
    const result = goal.recordProgress(entry);
    expect(result.isRight()).toBe(true);
    const outcome = result.value as ReturnType<Goal['recordProgress']> extends { value: infer T }
      ? T
      : never;
    void outcome;
    expect(goal.currentValue).toBe(80);
    expect(goal.progressPercentage).toBe(50);
    expect(goal.progressEntries).toHaveLength(1);
  });

  it('calculates 60% progress for increasing goal (muscle gain)', () => {
    // baseline=70, target=75, new=73 → 60%
    const goal = makeGoal({
      category: 'MUSCLE_GAIN',
      metricType: 'STRENGTH',
      baselineValue: 70,
      targetValue: 75,
      unit: 'kg',
    });
    const entry = makeProgressEntry({ value: 73, unit: 'kg' });
    goal.recordProgress(entry);
    expect(goal.progressPercentage).toBe(60);
  });

  it('detects regression for decreasing goal (weight went up)', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    goal.recordProgress(makeProgressEntry({ value: 80, unit: 'kg' }));
    const result = goal.recordProgress(makeProgressEntry({ value: 82, unit: 'kg' }));
    expect(result.isRight()).toBe(true);
    const outcome = (result as { value: { regressed: boolean } }).value;
    expect(outcome.regressed).toBe(true);
  });

  it('no regression when progress improves for decreasing goal', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    goal.recordProgress(makeProgressEntry({ value: 80, unit: 'kg' }));
    const result = goal.recordProgress(makeProgressEntry({ value: 78, unit: 'kg' }));
    const outcome = (result as { value: { regressed: boolean } }).value;
    expect(outcome.regressed).toBe(false);
  });

  it('detects regression for increasing goal (value went down)', () => {
    const goal = makeGoal({
      category: 'MUSCLE_GAIN',
      metricType: 'STRENGTH',
      baselineValue: 70,
      targetValue: 80,
      unit: 'kg',
    });
    goal.recordProgress(makeProgressEntry({ value: 74, unit: 'kg' }));
    const result = goal.recordProgress(makeProgressEntry({ value: 72, unit: 'kg' }));
    const outcome = (result as { value: { regressed: boolean } }).value;
    expect(outcome.regressed).toBe(true);
  });

  it('detects milestone reached', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    // Add milestone at 80kg
    const ms = Milestone.create({ name: 'Step 1', targetValue: 80, unit: 'kg', order: 1 })
      .value as Milestone;
    goal.addMilestone(ms);

    const result = goal.recordProgress(makeProgressEntry({ value: 79, unit: 'kg' }));
    const outcome = (result as unknown as { value: { milestonesReached: readonly unknown[] } })
      .value;
    expect(outcome.milestonesReached).toHaveLength(1);
    expect(ms.isReached()).toBe(true);
  });

  it('detects target reached for decreasing goal', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    const result = goal.recordProgress(makeProgressEntry({ value: 74, unit: 'kg' }));
    const outcome = (result as { value: { targetReached: boolean } }).value;
    expect(outcome.targetReached).toBe(true);
  });

  it('detects target reached for increasing goal', () => {
    const goal = makeGoal({
      category: 'MUSCLE_GAIN',
      metricType: 'STRENGTH',
      baselineValue: 70,
      targetValue: 80,
      unit: 'kg',
    });
    const result = goal.recordProgress(makeProgressEntry({ value: 80, unit: 'kg' }));
    const outcome = (result as { value: { targetReached: boolean } }).value;
    expect(outcome.targetReached).toBe(true);
  });

  it('detects milestone reached for increasing goal', () => {
    const goal = makeGoal({
      category: 'MUSCLE_GAIN',
      metricType: 'STRENGTH',
      baselineValue: 70,
      targetValue: 80,
      unit: 'kg',
    });
    const ms = Milestone.create({ name: 'Half way', targetValue: 75, unit: 'kg', order: 1 })
      .value as Milestone;
    goal.addMilestone(ms);

    const result = goal.recordProgress(makeProgressEntry({ value: 75, unit: 'kg' }));
    const outcome = (result as unknown as { value: { milestonesReached: readonly unknown[] } })
      .value;
    expect(outcome.milestonesReached).toHaveLength(1);
  });

  it('fails if goal is not active', () => {
    const goal = makeGoal({ approved: false, started: false });
    const result = goal.recordProgress(makeProgressEntry({ value: 80, unit: 'kg' }));
    expect(result.isLeft()).toBe(true);
  });

  it('clamps progress to 0 minimum', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    // Current goes above baseline (regression beyond start)
    goal.recordProgress(makeProgressEntry({ value: 90, unit: 'kg' }));
    expect(goal.progressPercentage).toBe(0);
  });

  it('returns offTrack=false when no targetDate', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75, targetDate: null });
    const result = goal.recordProgress(makeProgressEntry({ value: 83, unit: 'kg' }));
    const outcome = (result as { value: { offTrack: boolean } }).value;
    expect(outcome.offTrack).toBe(false);
  });
});

// ── Goal.complete() ───────────────────────────────────────────────────────────

describe('Goal.complete()', () => {
  it('completes with achieved=true', () => {
    const goal = makeGoal();
    goal.recordProgress(makeProgressEntry({ value: 74, unit: 'kg' }));
    const result = goal.complete(true);
    expect(result.isRight()).toBe(true);
    expect(goal.isCompleted()).toBe(true);
    expect(goal.isAchieved()).toBe(true);
    expect(goal.isActive()).toBe(false);
    const outcome = (result as { value: { type: string } }).value;
    expect(outcome.type).toBe('completed_achieved');
  });

  it('completes with achieved=false', () => {
    const goal = makeGoal();
    const result = goal.complete(false);
    expect(result.isRight()).toBe(true);
    const outcome = (result as { value: { type: string; gap: number } }).value;
    expect(outcome.type).toBe('completed_not_achieved');
    expect(outcome.gap).toBeGreaterThan(0);
    expect(goal.isAchieved()).toBe(false);
  });

  it('fails if goal is not active', () => {
    const goal = makeGoal({ approved: false, started: false });
    expect(goal.complete(false).isLeft()).toBe(true);
  });

  it('fails if already completed', () => {
    const goal = makeGoal();
    goal.complete(false);
    expect(goal.complete(false).isLeft()).toBe(true);
  });
});

// ── Goal.abandon() ────────────────────────────────────────────────────────────

describe('Goal.abandon()', () => {
  it('abandons an active goal', () => {
    const goal = makeGoal();
    const result = goal.abandon('No longer relevant');
    expect(result.isRight()).toBe(true);
    expect(goal.isAbandoned()).toBe(true);
    expect(goal.isActive()).toBe(false);
  });

  it('abandons a draft goal', () => {
    const goal = makeGoal({ approved: false, started: false });
    const result = goal.abandon('Changed mind');
    expect(result.isRight()).toBe(true);
    expect(goal.isAbandoned()).toBe(true);
  });

  it('fails if already completed', () => {
    const goal = makeGoal();
    goal.complete(false);
    expect(goal.abandon('reason').isLeft()).toBe(true);
  });

  it('fails if already abandoned', () => {
    const goal = makeGoal();
    goal.abandon('reason');
    expect(goal.abandon('reason again').isLeft()).toBe(true);
  });
});

// ── Goal.adjustTarget() ───────────────────────────────────────────────────────

describe('Goal.adjustTarget()', () => {
  it('adjusts target and recalculates progress', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    goal.recordProgress(makeProgressEntry({ value: 80, unit: 'kg' }));
    // Before: (80-85)/(75-85)*100 = 50%
    expect(goal.progressPercentage).toBe(50);

    const result = goal.adjustTarget(70, 'Client wants to lose more');
    expect(result.isRight()).toBe(true);
    expect(goal.targetValue).toBe(70);
    // After: (80-85)/(70-85)*100 = 33.33%
    expect(goal.progressPercentage).toBeCloseTo(33.33, 1);
    const outcome = (result as { value: { oldTarget: number; newTarget: number } }).value;
    expect(outcome.oldTarget).toBe(75);
    expect(outcome.newTarget).toBe(70);
  });

  it('fails if goal is not active', () => {
    const goal = makeGoal({ approved: false, started: false });
    expect(goal.adjustTarget(70, 'reason').isLeft()).toBe(true);
  });
});

// ── Goal.extendDeadline() ─────────────────────────────────────────────────────

describe('Goal.extendDeadline()', () => {
  it('extends the deadline', () => {
    const goal = makeGoal({ targetDate: '2099-06-01' });
    const result = goal.extendDeadline('2099-12-31', 'Need more time');
    expect(result.isRight()).toBe(true);
    expect(goal.targetDate).toBe('2099-12-31');
    const outcome = (result as { value: { oldDeadline: string | null; newDeadline: string } })
      .value;
    expect(outcome.oldDeadline).toBe('2099-06-01');
    expect(outcome.newDeadline).toBe('2099-12-31');
  });

  it('fails if goal is not active', () => {
    const goal = makeGoal({ approved: false, started: false });
    expect(goal.extendDeadline('2099-12-31', 'reason').isLeft()).toBe(true);
  });
});

// ── Goal.addMilestone() ───────────────────────────────────────────────────────

describe('Goal.addMilestone()', () => {
  it('adds a valid milestone (decreasing goal)', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    const ms = Milestone.create({ name: 'Milestone 1', targetValue: 80, unit: 'kg', order: 1 })
      .value as Milestone;
    const result = goal.addMilestone(ms);
    expect(result.isRight()).toBe(true);
    expect(goal.milestones).toHaveLength(1);
  });

  it('rejects milestone with target outside range (decreasing goal)', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    // Target of 90 is above baseline → invalid for decreasing goal
    const ms = Milestone.create({ name: 'Invalid', targetValue: 90, unit: 'kg', order: 1 })
      .value as Milestone;
    const result = goal.addMilestone(ms);
    expect(result.isLeft()).toBe(true);
  });

  it('adds a valid milestone (increasing goal)', () => {
    const goal = makeGoal({
      category: 'MUSCLE_GAIN',
      metricType: 'STRENGTH',
      baselineValue: 70,
      targetValue: 80,
      unit: 'kg',
    });
    const ms = Milestone.create({ name: 'Step 1', targetValue: 75, unit: 'kg', order: 1 })
      .value as Milestone;
    const result = goal.addMilestone(ms);
    expect(result.isRight()).toBe(true);
  });

  it('rejects milestone target at baseline or target boundary', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    const msAtBaseline = Milestone.create({
      name: 'At baseline',
      targetValue: 85,
      unit: 'kg',
      order: 1,
    }).value as Milestone;
    expect(goal.addMilestone(msAtBaseline).isLeft()).toBe(true);
  });
});

// ── Query helpers ─────────────────────────────────────────────────────────────

describe('Goal query helpers', () => {
  it('getMilestoneProgress returns correct counts', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    const ms1 = Milestone.create({ name: 'Step 1', targetValue: 82, unit: 'kg', order: 1 })
      .value as Milestone;
    const ms2 = Milestone.create({ name: 'Step 2', targetValue: 79, unit: 'kg', order: 2 })
      .value as Milestone;
    goal.addMilestone(ms1);
    goal.addMilestone(ms2);
    ms1.markReached();
    expect(goal.getMilestoneProgress()).toEqual({ reached: 1, total: 2 });
  });

  it('getLatestProgress returns null for no entries', () => {
    const goal = makeGoal();
    expect(goal.getLatestProgress()).toBeNull();
  });

  it('getLatestProgress returns last entry', () => {
    const goal = makeGoal();
    goal.recordProgress(makeProgressEntry({ value: 82, unit: 'kg' }));
    goal.recordProgress(makeProgressEntry({ value: 80, unit: 'kg' }));
    expect(goal.getLatestProgress()?.value).toBe(80);
  });

  it('daysRemaining returns null when no targetDate', () => {
    const goal = makeGoal({ targetDate: null });
    expect(goal.daysRemaining()).toBeNull();
  });

  it('daysRemaining returns positive number for future date', () => {
    const goal = makeGoal({ targetDate: '2099-12-31' });
    expect(goal.daysRemaining()).toBeGreaterThan(0);
  });

  it('isOnTrack returns true when no targetDate', () => {
    const goal = makeGoal({ targetDate: null });
    expect(goal.isOnTrack()).toBe(true);
  });

  it('hasReachedTarget is false initially', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    expect(goal.hasReachedTarget()).toBe(false);
  });

  it('hasReachedTarget is true after reaching target', () => {
    const goal = makeGoal({ baselineValue: 85, targetValue: 75 });
    goal.recordProgress(makeProgressEntry({ value: 74, unit: 'kg' }));
    expect(goal.hasReachedTarget()).toBe(true);
  });

  it('achievedFlag getter returns false before completion', () => {
    const goal = makeGoal();
    expect(goal.achievedFlag).toBe(false);
  });

  it('achievedFlag getter returns true after achieved completion', () => {
    const goal = makeGoal();
    goal.complete(true);
    expect(goal.achievedFlag).toBe(true);
  });

  it('updatedAtUtc getter returns a UTCDateTime', () => {
    const goal = makeGoal();
    expect(goal.updatedAtUtc).toBeDefined();
    expect(goal.updatedAtUtc.value).toBeInstanceOf(Date);
  });
});

// ── Goal.complete() — GoalAlreadyCompletedError ────────────────────────────────

describe('Goal.complete() — already completed', () => {
  it('returns GoalAlreadyCompletedError when goal was already completed', () => {
    const goal = makeGoal();
    goal.complete(false);
    const result = goal.complete(false);
    expect(result.isLeft()).toBe(true);
    expect((result.value as { message: string }).message).toContain('already been completed');
  });
});

// ── Goal.reconstitute() with entities ─────────────────────────────────────────

describe('Goal.reconstitute() with progressEntries and milestones', () => {
  it('reconstitutes entries and milestones from persistence', () => {
    const now = new Date();
    const reachedAt = UTCDateTime.now();
    const goal = Goal.reconstitute(
      generateId(),
      {
        clientId: generateId(),
        professionalProfileId: generateId(),
        name: 'Reconstituted Goal',
        description: 'Test reconstitution',
        category: 'WEIGHT_LOSS',
        metricType: 'WEIGHT',
        baselineValue: 90,
        targetValue: 75,
        unit: 'kg',
        priority: 'HIGH',
        reason: null,
        targetDate: null,
        currentValue: 85,
        progressPercentage: 33.33,
        lastProgressUpdateAtUtc: UTCDateTime.now(),
        createdAtUtc: UTCDateTime.now(),
        approvedAtUtc: UTCDateTime.now(),
        startedAtUtc: UTCDateTime.now(),
        completedAtUtc: null,
        abandonedAtUtc: null,
        achievedFlag: false,
        updatedAtUtc: UTCDateTime.now(),
        progressEntries: [
          {
            id: generateId(),
            props: {
              value: 85,
              unit: 'kg',
              source: 'MANUAL',
              recordedAtUtc: now,
              recordedBy: null,
              notes: null,
            },
          },
        ],
        milestones: [
          {
            id: generateId(),
            props: {
              name: 'First milestone',
              targetValue: 82,
              unit: 'kg',
              order: 1,
              reachedAtUtc: reachedAt,
            },
          },
        ],
      },
      1,
    );

    expect(goal.progressEntries).toHaveLength(1);
    expect(goal.progressEntries[0]!.value).toBe(85);
    expect(goal.milestones).toHaveLength(1);
    expect(goal.milestones[0]!.isReached()).toBe(true);
    expect(goal.milestones[0]!.reachedAtUtc).toBe(reachedAt);
  });
});

// ── _computeOffTrackStatus edge cases ─────────────────────────────────────────

describe('Goal off-track detection edge cases', () => {
  it('returns offTrack=false when startedAtUtc is after targetDate (totalDays <= 0)', () => {
    // startedAtUtc (5 days ago) is AFTER targetDate (10 days ago) → totalDays < 0 → offTrack=false
    const fiveDaysAgo = new Date(Date.now() - 5 * 86_400_000);
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000);

    const goal = Goal.reconstitute(
      generateId(),
      {
        clientId: generateId(),
        professionalProfileId: generateId(),
        name: 'Past Goal',
        description: 'Start after target',
        category: 'WEIGHT_LOSS',
        metricType: 'WEIGHT',
        baselineValue: 85,
        targetValue: 75,
        unit: 'kg',
        priority: 'MEDIUM',
        reason: null,
        targetDate: tenDaysAgo.toISOString().slice(0, 10), // target was 10 days ago
        currentValue: 85,
        progressPercentage: 0,
        lastProgressUpdateAtUtc: null,
        createdAtUtc: UTCDateTime.from(fiveDaysAgo).value as UTCDateTime,
        approvedAtUtc: UTCDateTime.from(fiveDaysAgo).value as UTCDateTime,
        startedAtUtc: UTCDateTime.from(fiveDaysAgo).value as UTCDateTime, // started 5 days ago (after target!)
        completedAtUtc: null,
        abandonedAtUtc: null,
        achievedFlag: false,
        updatedAtUtc: UTCDateTime.from(fiveDaysAgo).value as UTCDateTime,
        progressEntries: [],
        milestones: [],
      },
      1,
    );

    // totalDays = (targetMs - startMs) = (-10d) - (-5d) = -5d ≤ 0 → returns { offTrack: false }
    expect(goal.isOnTrack()).toBe(true);
  });

  it('returns offTrack=true when progress is significantly behind schedule', () => {
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
        progressPercentage: 0, // no progress at all
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

    // started 90 days ago, target 90 days from now → expected progress ~50%, actual 0% → off track
    expect(goal.isOnTrack()).toBe(false);
  });
});
