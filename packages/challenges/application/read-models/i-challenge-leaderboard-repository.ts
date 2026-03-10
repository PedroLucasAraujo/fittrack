import type { ChallengeLeaderboard } from './challenge-leaderboard.js';

export interface IChallengeLeaderboardRepository {
  save(leaderboard: ChallengeLeaderboard): Promise<void>;
  findByChallengeId(challengeId: string): Promise<ChallengeLeaderboard | null>;
}
