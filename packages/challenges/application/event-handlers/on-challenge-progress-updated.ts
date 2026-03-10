import { ChallengeLeaderboard } from '../read-models/challenge-leaderboard.js';
import type { IChallengeLeaderboardRepository } from '../read-models/i-challenge-leaderboard-repository.js';

/**
 * Handles ChallengeProgressUpdated events and keeps the ChallengeLeaderboard
 * read model up to date.
 *
 * ## Idempotency
 *
 * upsertEntry() is idempotent: upserting the same participationId with the same
 * progress values recalculates rankings but produces the same leaderboard state.
 * At-least-once delivery is therefore safe.
 *
 * ## Read model ownership
 *
 * ChallengeLeaderboard is a projection, not an aggregate. It is rebuilt
 * asynchronously from domain events and must never be used as the source
 * of truth for business decisions.
 */
export interface ChallengeProgressUpdatedEventPayload {
  participationId: string;
  challengeId: string;
  userId: string;
  currentProgress: number;
  progressPercentage: number;
  completedAtUtc: Date | null;
  updatedAtUtc: Date;
}

export class OnChallengeProgressUpdated {
  constructor(private readonly leaderboardRepo: IChallengeLeaderboardRepository) {}

  async handle(event: ChallengeProgressUpdatedEventPayload): Promise<void> {
    let leaderboard = await this.leaderboardRepo.findByChallengeId(event.challengeId);
    if (!leaderboard) {
      leaderboard = ChallengeLeaderboard.create(event.challengeId);
    }
    leaderboard.upsertEntry({
      participationId: event.participationId,
      userId: event.userId,
      currentProgress: event.currentProgress,
      progressPercentage: event.progressPercentage,
      completedAtUtc: event.completedAtUtc,
      lastUpdatedAtUtc: event.updatedAtUtc,
    });
    await this.leaderboardRepo.save(leaderboard);
  }
}
