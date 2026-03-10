import type { ChallengeParticipation } from '../aggregates/challenge-participation.js';

/**
 * Repository contract for the ChallengeParticipation aggregate.
 *
 * Each record tracks one user's progress within one challenge. Two records
 * for the same (challengeId, userId) pair must not coexist — enforced by
 * `findByChallengeAndUser` checks before creation.
 */
export interface IChallengeParticipationRepository {
  save(participation: ChallengeParticipation): Promise<void>;
  findById(id: string): Promise<ChallengeParticipation | null>;
  /** Returns all participations for a given challenge (any progress state). */
  findByChallenge(challengeId: string): Promise<ChallengeParticipation[]>;
  /** Returns all participations across all challenges for a given user. */
  findByUser(userId: string): Promise<ChallengeParticipation[]>;
  /** Returns the participation record for the exact (challenge, user) pair, or null. */
  findByChallengeAndUser(
    challengeId: string,
    userId: string,
  ): Promise<ChallengeParticipation | null>;
  /** Returns total number of participants in the challenge. */
  countByChallenge(challengeId: string): Promise<number>;
  /** Returns number of participants who have reached completedAtUtc !== null. */
  countCompletedByChallenge(challengeId: string): Promise<number>;
}
