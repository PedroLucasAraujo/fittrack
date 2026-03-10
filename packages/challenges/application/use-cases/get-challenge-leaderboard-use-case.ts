import { right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { IChallengeLeaderboardRepository } from '../read-models/i-challenge-leaderboard-repository.js';
import type {
  GetChallengeLeaderboardInputDTO,
  GetChallengeLeaderboardOutputDTO,
  LeaderboardEntryDTO,
} from '../dtos/get-challenge-leaderboard-dto.js';

export class GetChallengeLeaderboardUseCase {
  constructor(private readonly leaderboardRepo: IChallengeLeaderboardRepository) {}

  async execute(
    dto: GetChallengeLeaderboardInputDTO,
  ): Promise<DomainResult<GetChallengeLeaderboardOutputDTO>> {
    // 1. Find leaderboard
    const leaderboard = await this.leaderboardRepo.findByChallengeId(dto.challengeId);

    // 2. If null, return empty leaderboard
    if (!leaderboard) {
      return right({
        challengeId: dto.challengeId,
        entries: [],
        lastUpdatedAtUtc: null,
      });
    }

    // 3. Get entries, optionally sliced to topN
    const entries = dto.topN !== undefined ? leaderboard.getTopN(dto.topN) : leaderboard.entries;

    // 4. Map to LeaderboardEntryDTO
    const entryDTOs: LeaderboardEntryDTO[] = entries.map((e) => ({
      participationId: e.participationId,
      userId: e.userId,
      currentProgress: e.currentProgress,
      progressPercentage: e.progressPercentage,
      rank: e.rank,
      completedAtUtc: e.completedAtUtc,
    }));

    return right({
      challengeId: dto.challengeId,
      entries: entryDTOs,
      lastUpdatedAtUtc: leaderboard.lastUpdatedAtUtc,
    });
  }
}
