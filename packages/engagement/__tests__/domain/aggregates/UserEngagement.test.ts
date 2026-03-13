import { describe, it, expect, beforeEach } from 'vitest';
import { UserEngagement } from '../../../domain/aggregates/UserEngagement.js';
import type { UpdateScoresInput } from '../../../domain/aggregates/UserEngagement.js';
import { EngagementScore } from '../../../domain/value-objects/EngagementScore.js';
import { DaysInactive } from '../../../domain/value-objects/DaysInactive.js';

function makeScores(workout = 80, habit = 60, goal = 50, streak = 40) {
  return {
    workoutScore: EngagementScore.create(workout).value as EngagementScore,
    habitScore: EngagementScore.create(habit).value as EngagementScore,
    goalProgressScore: EngagementScore.create(goal).value as EngagementScore,
    streakScore: EngagementScore.create(streak).value as EngagementScore,
  };
}

function makeInput(overrides: Partial<UpdateScoresInput> = {}): UpdateScoresInput {
  return {
    ...makeScores(),
    workoutsCompleted: 3,
    nutritionLogsCreated: 5,
    bookingsAttended: 2,
    currentStreak: 12,
    activeGoalsCount: 2,
    goalsOnTrackCount: 1,
    windowStartDate: '2026-03-03',
    windowEndDate: '2026-03-09',
    calculatedAtUtc: '2026-03-09T00:00:00.000Z',
    daysInactive: DaysInactive.create(1).value as DaysInactive,
    lastActivityDate: '2026-03-08',
    previousWeekScore: null,
    ...overrides,
  };
}

function makeEngagement(): UserEngagement {
  const result = UserEngagement.create({
    userId: '550e8400-e29b-41d4-a716-446655440001',
    professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
  });
  if (result.isLeft()) throw new Error('Failed to create UserEngagement');
  return result.value;
}

describe('UserEngagement', () => {
  describe('create()', () => {
    it('creates with valid params', () => {
      const result = UserEngagement.create({
        userId: '550e8400-e29b-41d4-a716-446655440001',
        professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
      });
      expect(result.isRight()).toBe(true);
      const e = result.value as UserEngagement;
      expect(e.userId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(e.overallScore.value).toBe(0);
      expect(e.history.length).toBe(0);
      expect(e.isAtRisk).toBe(false);
    });

    it('rejects empty userId', () => {
      const result = UserEngagement.create({
        userId: '',
        professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
      });
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty professionalProfileId', () => {
      const result = UserEngagement.create({
        userId: '550e8400-e29b-41d4-a716-446655440001',
        professionalProfileId: '',
      });
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('updateScores()', () => {
    let engagement: UserEngagement;

    beforeEach(() => {
      engagement = makeEngagement();
    });

    it('calculates overall score correctly', () => {
      const result = engagement.updateScores(makeInput({ previousWeekScore: null }));
      expect(result.isRight()).toBe(true);
      const outcome = result.value as { overallScore: number };
      // 80*0.4 + 60*0.25 + 50*0.2 + 40*0.15 = 32+15+10+6 = 63
      expect(outcome.overallScore).toBe(63);
    });

    it('determines engagement level from overall score', () => {
      const result = engagement.updateScores(makeInput());
      const outcome = result.value as { engagementLevel: string };
      expect(outcome.engagementLevel).toBe('HIGH'); // 63 → HIGH
    });

    it('returns STABLE trend when no previous score', () => {
      const result = engagement.updateScores(makeInput({ previousWeekScore: null }));
      const outcome = result.value as { trend: string };
      expect(outcome.trend).toBe('STABLE');
    });

    it('returns IMPROVING trend when delta >= +10', () => {
      // First: set overallScore to 50 by reconstituting
      const result = engagement.updateScores(makeInput({ previousWeekScore: 50 }));
      const outcome = result.value as { trend: string };
      // current = 63, previous = 50, delta = 13 → IMPROVING
      expect(outcome.trend).toBe('IMPROVING');
    });

    it('returns DECLINING trend when delta <= -10', () => {
      const result = engagement.updateScores(makeInput({ previousWeekScore: 80 }));
      const outcome = result.value as { trend: string };
      // current = 63, previous = 80, delta = -17 → DECLINING
      expect(outcome.trend).toBe('DECLINING');
    });

    it('returns STABLE trend for delta -9 to +9', () => {
      const result = engagement.updateScores(makeInput({ previousWeekScore: 60 }));
      const outcome = result.value as { trend: string };
      // current = 63, previous = 60, delta = 3 → STABLE
      expect(outcome.trend).toBe('STABLE');
    });

    it('detects churn risk: VERY_LOW + 7+ days inactive + DECLINING', () => {
      const lowScores = makeScores(5, 5, 5, 5); // very low overall
      const input = makeInput({
        ...lowScores,
        daysInactive: DaysInactive.create(10).value as DaysInactive,
        previousWeekScore: 30,
      });
      const result = engagement.updateScores(input);
      const outcome = result.value as { churnRiskDetected: boolean; engagementLevel: string };
      // overall = 5*0.4 + 5*0.25 + 5*0.2 + 5*0.15 = 5 → VERY_LOW
      // days inactive = 10 → churnRisk
      // delta = 5 - 30 = -25 → DECLINING
      expect(outcome.engagementLevel).toBe('VERY_LOW');
      expect(outcome.churnRiskDetected).toBe(true);
      expect(engagement.isAtRisk).toBe(true);
      expect(engagement.riskDetectedAtUtc).not.toBeNull();
    });

    it('detects churn risk: streak broken after long streak (rule 2)', () => {
      // First populate history with a streak of 30
      engagement.updateScores(
        makeInput({
          currentStreak: 30,
          previousWeekScore: null,
        }),
      );
      engagement.addHistorySnapshot();

      // Now streak breaks
      const result = engagement.updateScores(
        makeInput({
          currentStreak: 0,
          previousWeekScore: 63,
        }),
      );
      const outcome = result.value as { churnRiskDetected: boolean };
      expect(outcome.churnRiskDetected).toBe(true);
    });

    it('does NOT detect churn risk when streak breaks below threshold', () => {
      // History streak < 30
      engagement.updateScores(makeInput({ currentStreak: 10, previousWeekScore: null }));
      engagement.addHistorySnapshot();

      const result = engagement.updateScores(makeInput({ currentStreak: 0, previousWeekScore: 63 }));
      const outcome = result.value as { churnRiskDetected: boolean };
      expect(outcome.churnRiskDetected).toBe(false);
    });

    it('resolves churn risk when user improves', () => {
      // Set at-risk first
      const lowScores = makeScores(5, 5, 5, 5);
      engagement.updateScores(
        makeInput({
          ...lowScores,
          daysInactive: DaysInactive.create(10).value as DaysInactive,
          previousWeekScore: 30,
        }),
      );
      expect(engagement.isAtRisk).toBe(true);

      // Now user improves
      const goodInput = makeInput({
        ...makeScores(90, 80, 70, 60),
        daysInactive: DaysInactive.create(0).value as DaysInactive,
        previousWeekScore: 5,
      });
      const result = engagement.updateScores(goodInput);
      const outcome = result.value as { churnRiskResolved: boolean };
      expect(outcome.churnRiskResolved).toBe(true);
      expect(engagement.isAtRisk).toBe(false);
      expect(engagement.riskDetectedAtUtc).toBeNull();
    });

    it('detects engagement improvement of >=20%', () => {
      const result = engagement.updateScores(makeInput({ previousWeekScore: 40 }));
      const outcome = result.value as { engagementImproved: boolean; improvementPercentage: number };
      // current = 63, previous = 40, improvement = (63-40)/40*100 ≈ 58%
      expect(outcome.engagementImproved).toBe(true);
      expect(outcome.improvementPercentage).toBeGreaterThanOrEqual(20);
    });

    it('does NOT flag improvement below 20%', () => {
      const result = engagement.updateScores(makeInput({ previousWeekScore: 60 }));
      const outcome = result.value as { engagementImproved: boolean };
      // current = 63, previous = 60, improvement ≈ 5% → not significant
      expect(outcome.engagementImproved).toBe(false);
    });

    it('updates all raw metric counters', () => {
      engagement.updateScores(makeInput({ workoutsCompleted: 4, nutritionLogsCreated: 7, bookingsAttended: 3 }));
      expect(engagement.workoutsCompleted).toBe(4);
      expect(engagement.nutritionLogsCreated).toBe(7);
      expect(engagement.bookingsAttended).toBe(3);
    });
  });

  describe('addHistorySnapshot()', () => {
    it('adds a snapshot after updateScores()', () => {
      const engagement = makeEngagement();
      engagement.updateScores(makeInput());
      const result = engagement.addHistorySnapshot();
      expect(result.isRight()).toBe(true);
      expect(engagement.history.length).toBe(1);
    });

    it('caps history at 12 entries', () => {
      const engagement = makeEngagement();
      for (let i = 0; i < 14; i++) {
        engagement.updateScores(makeInput({ windowStartDate: `2025-0${String(i + 1).padStart(2, '0')}-01`, windowEndDate: `2025-0${String(i + 1).padStart(2, '0')}-07` }));
        engagement.addHistorySnapshot();
      }
      expect(engagement.history.length).toBe(12);
    });

    it('returns immutable history copy', () => {
      const engagement = makeEngagement();
      engagement.updateScores(makeInput());
      engagement.addHistorySnapshot();
      const h1 = engagement.history;
      const h2 = engagement.history;
      expect(h1).not.toBe(h2); // different array reference (copy)
      expect(h1.length).toBe(h2.length);
    });
  });

  describe('query helpers', () => {
    it('isAtChurnRisk() reflects isAtRisk prop', () => {
      const engagement = makeEngagement();
      expect(engagement.isAtChurnRisk()).toBe(false);
      const lowScores = makeScores(5, 5, 5, 5);
      engagement.updateScores(makeInput({ ...lowScores, daysInactive: DaysInactive.create(10).value as DaysInactive, previousWeekScore: 30 }));
      expect(engagement.isAtChurnRisk()).toBe(true);
    });

    it('hasImproved() returns true when trend is IMPROVING', () => {
      const engagement = makeEngagement();
      engagement.updateScores(makeInput({ previousWeekScore: 50 }));
      // 63 - 50 = 13 → IMPROVING
      expect(engagement.hasImproved()).toBe(true);
    });

    it('hasDeclined() returns true when trend is DECLINING', () => {
      const engagement = makeEngagement();
      engagement.updateScores(makeInput({ previousWeekScore: 80 }));
      expect(engagement.hasDeclined()).toBe(true);
    });

    it('isActive() returns false when no lastActivityDate', () => {
      const engagement = makeEngagement();
      expect(engagement.isActive()).toBe(false);
    });

    it('isActive() returns true when lastActivityDate is within 7 days', () => {
      const engagement = makeEngagement();
      const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      engagement.updateScores(makeInput({ lastActivityDate: recent, daysInactive: DaysInactive.create(2).value as DaysInactive }));
      expect(engagement.isActive()).toBe(true);
    });

    it('isActive() returns false when lastActivityDate is 8+ days ago', () => {
      const engagement = makeEngagement();
      const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      engagement.updateScores(makeInput({ lastActivityDate: old, daysInactive: DaysInactive.create(8).value as DaysInactive }));
      expect(engagement.isActive()).toBe(false);
    });
  });

  describe('reconstitute()', () => {
    it('restores from persistence', () => {
      const engagement = makeEngagement();
      engagement.updateScores(makeInput());

      const reconstituted = UserEngagement.reconstitute(
        engagement.id,
        {
          userId: engagement.userId,
          professionalProfileId: engagement.professionalProfileId,
          workoutScore: engagement.workoutScore,
          habitScore: engagement.habitScore,
          goalProgressScore: engagement.goalProgressScore,
          streakScore: engagement.streakScore,
          overallScore: engagement.overallScore,
          engagementLevel: engagement.engagementLevel,
          trend: engagement.trend,
          trendPercentage: engagement.trendPercentage,
          workoutsCompleted: engagement.workoutsCompleted,
          nutritionLogsCreated: engagement.nutritionLogsCreated,
          bookingsAttended: engagement.bookingsAttended,
          currentStreak: engagement.currentStreak,
          activeGoalsCount: engagement.activeGoalsCount,
          goalsOnTrackCount: engagement.goalsOnTrackCount,
          calculatedAtUtc: engagement.calculatedAtUtc,
          windowStartDate: engagement.windowStartDate,
          windowEndDate: engagement.windowEndDate,
          isAtRisk: engagement.isAtRisk,
          riskDetectedAtUtc: engagement.riskDetectedAtUtc,
          daysInactive: engagement.daysInactive,
          lastActivityDate: engagement.lastActivityDate,
          history: [...engagement.history] as any,
        },
        1,
      );

      expect(reconstituted.id).toBe(engagement.id);
      expect(reconstituted.overallScore.value).toBe(engagement.overallScore.value);
    });
  });
});
