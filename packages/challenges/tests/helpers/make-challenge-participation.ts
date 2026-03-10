import { UTCDateTime, generateId } from '@fittrack/core';
import { ChallengeParticipation } from '../../domain/aggregates/challenge-participation.js';
import type { ChallengeParticipationProps } from '../../domain/aggregates/challenge-participation.js';

/**
 * Test factory for ChallengeParticipation using `reconstitute()` to bypass
 * the create() factory and directly set arbitrary state.
 */
export function makeChallengeParticipation(
  overrides?: Partial<ChallengeParticipationProps> & { id?: string; version?: number },
): ChallengeParticipation {
  const now = new Date();
  const defaults: ChallengeParticipationProps = {
    challengeId: generateId(),
    userId: generateId(),
    currentProgress: 0,
    progressPercentage: 0,
    joinedAtUtc: now,
    completedAtUtc: null,
    lastProgressUpdateAtUtc: now,
    createdAtUtc: UTCDateTime.now(),
    updatedAtUtc: UTCDateTime.now(),
  };
  const { id, version, ...rest } = overrides ?? {};
  return ChallengeParticipation.reconstitute(
    id ?? generateId(),
    { ...defaults, ...rest },
    version ?? 0,
  );
}
