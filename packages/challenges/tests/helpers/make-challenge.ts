import { UTCDateTime, generateId } from '@fittrack/core';
import { Challenge } from '../../domain/aggregates/challenge.js';
import type { ChallengeProps } from '../../domain/aggregates/challenge.js';

/**
 * Test factory for Challenge using `reconstitute()` to bypass the
 * create() factory and directly set arbitrary state.
 */
export function makeChallenge(
  overrides?: Partial<ChallengeProps> & { id?: string; version?: number },
): Challenge {
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const defaults: ChallengeProps = {
    createdBy: generateId(),
    type: 'COMMUNITY',
    visibility: 'PUBLIC',
    name: 'Test Challenge',
    description: 'A test challenge description that meets minimum length.',
    category: 'WORKOUT',
    goalMetricType: 'WORKOUT_COUNT',
    goalTargetValue: 10,
    startDateUtc: now,
    endDateUtc: future,
    maxParticipants: null,
    rewardPolicy: 'WINNER',
    createdAtUtc: UTCDateTime.now(),
    updatedAtUtc: UTCDateTime.now(),
    startedAtUtc: null,
    endedAtUtc: null,
    canceledAtUtc: null,
  };
  const { id, version, ...rest } = overrides ?? {};
  return Challenge.reconstitute(id ?? generateId(), { ...defaults, ...rest }, version ?? 0);
}
