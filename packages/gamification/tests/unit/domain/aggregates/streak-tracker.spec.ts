import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { StreakTracker } from '../../../../domain/aggregates/streak-tracker.js';
import { ActivityDay } from '../../../../domain/value-objects/activity-day.js';
import { makeStreakTracker } from '../../../helpers/make-streak-tracker.js';

function day(str: string): ActivityDay {
  return ActivityDay.fromString(str).value as ActivityDay;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StreakTracker.create()', () => {
  it('creates a zeroed tracker', () => {
    const result = StreakTracker.create({
      userId: generateId(),
      createdAtUtc: { value: new Date() } as never,
      updatedAtUtc: { value: new Date() } as never,
    });
    expect(result.isRight()).toBe(true);
    const tracker = result.value as StreakTracker;
    expect(tracker.currentStreak).toBe(0);
    expect(tracker.longestStreak).toBe(0);
    expect(tracker.lastActivityDay).toBeNull();
    expect(tracker.freezeTokenCount).toBe(0);
  });
});

describe('StreakTracker.recordActivity()', () => {
  it('starts a new streak on first activity', () => {
    const tracker = makeStreakTracker({ userId: generateId() });
    const result = tracker.recordActivity(day('2025-03-10'));
    expect(result.isRight()).toBe(true);
    expect(result.value).toHaveProperty('type', 'started');
    expect(tracker.currentStreak).toBe(1);
    expect(tracker.lastActivityDay).toBe('2025-03-10');
    expect(tracker.streakStartDay).toBe('2025-03-10');
    expect(tracker.longestStreak).toBe(1);
  });

  it('is idempotent for same activityDay (noop)', () => {
    const tracker = makeStreakTracker({
      currentStreak: 5,
      lastActivityDay: '2025-03-10',
      longestStreak: 5,
    });
    const result = tracker.recordActivity(day('2025-03-10'));
    expect(result.isRight()).toBe(true);
    expect(result.value).toHaveProperty('type', 'noop');
    expect(tracker.currentStreak).toBe(5); // unchanged
  });

  it('increments streak for consecutive day', () => {
    const tracker = makeStreakTracker({
      currentStreak: 3,
      lastActivityDay: '2025-03-09',
      longestStreak: 3,
    });
    const result = tracker.recordActivity(day('2025-03-10'));
    expect(result.isRight()).toBe(true);
    expect(result.value).toHaveProperty('type', 'incremented');
    expect(tracker.currentStreak).toBe(4);
    expect(tracker.lastActivityDay).toBe('2025-03-10');
  });

  it('updates longestStreak when new record is set', () => {
    const tracker = makeStreakTracker({
      currentStreak: 7,
      lastActivityDay: '2025-03-09',
      longestStreak: 7,
    });
    const result = tracker.recordActivity(day('2025-03-10'));
    expect(result.isRight()).toBe(true);
    const outcome = result.value as { type: 'incremented'; isNewRecord: boolean };
    expect(outcome.isNewRecord).toBe(true);
    expect(tracker.longestStreak).toBe(8);
  });

  it('does not update longestStreak when not a new record', () => {
    const tracker = makeStreakTracker({
      currentStreak: 3,
      lastActivityDay: '2025-03-09',
      longestStreak: 10,
    });
    tracker.recordActivity(day('2025-03-10'));
    expect(tracker.longestStreak).toBe(10); // unchanged
  });

  it('earns a freeze token at 7-day milestone', () => {
    const tracker = makeStreakTracker({
      currentStreak: 6,
      lastActivityDay: '2025-03-09',
      longestStreak: 6,
      freezeTokenCount: 0,
    });
    const result = tracker.recordActivity(day('2025-03-10'));
    expect(result.isRight()).toBe(true);
    const outcome = result.value as { type: 'incremented'; earnedFreezeToken: boolean };
    expect(outcome.earnedFreezeToken).toBe(true);
    expect(tracker.freezeTokenCount).toBe(1);
    expect(tracker.freezeTokensEarnedTotal).toBe(1);
  });

  it('earns a freeze token at 14-day milestone', () => {
    const tracker = makeStreakTracker({
      currentStreak: 13,
      lastActivityDay: '2025-03-09',
      longestStreak: 13,
      freezeTokenCount: 0,
    });
    tracker.recordActivity(day('2025-03-10'));
    expect(tracker.freezeTokenCount).toBe(1);
  });

  it('does NOT earn a freeze token if already at max (2)', () => {
    const tracker = makeStreakTracker({
      currentStreak: 6,
      lastActivityDay: '2025-03-09',
      longestStreak: 6,
      freezeTokenCount: 2,
    });
    const result = tracker.recordActivity(day('2025-03-10'));
    const outcome = result.value as { type: 'incremented'; earnedFreezeToken: boolean };
    expect(outcome.earnedFreezeToken).toBe(false);
    expect(tracker.freezeTokenCount).toBe(2); // unchanged
  });

  it('does NOT earn a freeze token on non-milestone days', () => {
    const tracker = makeStreakTracker({
      currentStreak: 5,
      lastActivityDay: '2025-03-09',
      longestStreak: 5,
      freezeTokenCount: 0,
    });
    tracker.recordActivity(day('2025-03-10'));
    expect(tracker.freezeTokenCount).toBe(0);
  });

  it('resets streak with "restarted" outcome when there is a gap', () => {
    const tracker = makeStreakTracker({
      currentStreak: 10,
      lastActivityDay: '2025-03-07', // 3 days ago — gap!
      longestStreak: 10,
    });
    const result = tracker.recordActivity(day('2025-03-10'));
    expect(result.isRight()).toBe(true);
    const outcome = result.value as { type: 'restarted'; previousStreak: number };
    expect(outcome.type).toBe('restarted');
    expect(outcome.previousStreak).toBe(10);
    expect(tracker.currentStreak).toBe(1);
    expect(tracker.streakStartDay).toBe('2025-03-10');
  });

  it('restarts from 0 after explicit break', () => {
    const tracker = makeStreakTracker({ currentStreak: 0, lastActivityDay: null });
    tracker.recordActivity(day('2025-03-10'));
    expect(tracker.currentStreak).toBe(1);
    expect(tracker.streakStartDay).toBe('2025-03-10');
  });
});

describe('StreakTracker.useFreezeToken()', () => {
  it('consumes a token and sets lastActivityDay to yesterday', () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const tracker = makeStreakTracker({
      currentStreak: 5,
      lastActivityDay: '2025-03-08', // 2 days ago → at risk
      freezeTokenCount: 1,
    });
    const result = tracker.useFreezeToken('2025-03-10');
    expect(result.isRight()).toBe(true);
    expect(tracker.freezeTokenCount).toBe(0);
    expect(tracker.freezeTokensUsedTotal).toBe(1);
    expect(tracker.lastActivityDay).toBe('2025-03-09'); // yesterday
  });

  it('returns Left when no tokens available', () => {
    const tracker = makeStreakTracker({
      currentStreak: 5,
      lastActivityDay: '2025-03-08',
      freezeTokenCount: 0,
    });
    expect(tracker.useFreezeToken('2025-03-10').isLeft()).toBe(true);
  });

  it('returns Left when streak is not at risk', () => {
    const tracker = makeStreakTracker({
      currentStreak: 5,
      lastActivityDay: '2025-03-09', // yesterday — not at risk
      freezeTokenCount: 1,
    });
    expect(tracker.useFreezeToken('2025-03-10').isLeft()).toBe(true);
  });
});

describe('StreakTracker.isAtRisk()', () => {
  it('returns true when lastActivityDay < yesterday', () => {
    const tracker = makeStreakTracker({
      currentStreak: 5,
      lastActivityDay: '2025-03-08',
    });
    expect(tracker.isAtRisk('2025-03-10')).toBe(true);
  });

  it('returns false when lastActivityDay is yesterday', () => {
    const tracker = makeStreakTracker({
      currentStreak: 5,
      lastActivityDay: '2025-03-09',
    });
    expect(tracker.isAtRisk('2025-03-10')).toBe(false);
  });

  it('returns false when streak is 0', () => {
    const tracker = makeStreakTracker({
      currentStreak: 0,
      lastActivityDay: '2025-03-08',
    });
    expect(tracker.isAtRisk('2025-03-10')).toBe(false);
  });

  it('returns false when lastActivityDay is null', () => {
    const tracker = makeStreakTracker({ currentStreak: 0, lastActivityDay: null });
    expect(tracker.isAtRisk('2025-03-10')).toBe(false);
  });
});

describe('StreakTracker.hasFreezeTokens()', () => {
  it('returns false when 0 tokens', () => {
    expect(makeStreakTracker({ freezeTokenCount: 0 }).hasFreezeTokens()).toBe(false);
  });

  it('returns true when > 0 tokens', () => {
    expect(makeStreakTracker({ freezeTokenCount: 1 }).hasFreezeTokens()).toBe(true);
  });
});

describe('StreakTracker.daysUntilNextFreezeToken()', () => {
  it('returns 7 when streak is 0', () => {
    expect(makeStreakTracker({ currentStreak: 0 }).daysUntilNextFreezeToken()).toBe(7);
  });

  it('returns correct value for streak = 3 (4 days until 7)', () => {
    expect(makeStreakTracker({ currentStreak: 3 }).daysUntilNextFreezeToken()).toBe(4);
  });

  it('returns 7 when streak is exactly at milestone (multiple of 7)', () => {
    expect(makeStreakTracker({ currentStreak: 7 }).daysUntilNextFreezeToken()).toBe(7);
    expect(makeStreakTracker({ currentStreak: 14 }).daysUntilNextFreezeToken()).toBe(7);
  });

  it('returns 1 when one day before milestone', () => {
    expect(makeStreakTracker({ currentStreak: 6 }).daysUntilNextFreezeToken()).toBe(1);
    expect(makeStreakTracker({ currentStreak: 13 }).daysUntilNextFreezeToken()).toBe(1);
  });
});
