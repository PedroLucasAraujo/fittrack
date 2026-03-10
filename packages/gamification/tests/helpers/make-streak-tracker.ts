import { UTCDateTime, generateId } from '@fittrack/core';
import { StreakTracker } from '../../domain/aggregates/streak-tracker.js';
import type { StreakTrackerProps } from '../../domain/aggregates/streak-tracker.js';

/**
 * Test factory for StreakTracker using `reconstitute()` to bypass the
 * create() factory and directly set arbitrary state.
 */
export function makeStreakTracker(
  overrides: Partial<StreakTrackerProps> & { id?: string } = {},
): StreakTracker {
  const now = UTCDateTime.now();
  const props: StreakTrackerProps = {
    userId: overrides.userId ?? generateId(),
    currentStreak: overrides.currentStreak ?? 0,
    longestStreak: overrides.longestStreak ?? 0,
    lastActivityDay: overrides.lastActivityDay ?? null,
    streakStartDay: overrides.streakStartDay ?? null,
    freezeTokenCount: overrides.freezeTokenCount ?? 0,
    freezeTokensEarnedTotal: overrides.freezeTokensEarnedTotal ?? 0,
    freezeTokensUsedTotal: overrides.freezeTokensUsedTotal ?? 0,
    createdAtUtc: overrides.createdAtUtc ?? now,
    updatedAtUtc: overrides.updatedAtUtc ?? now,
  };
  return StreakTracker.reconstitute(overrides.id ?? generateId(), props, 0);
}
