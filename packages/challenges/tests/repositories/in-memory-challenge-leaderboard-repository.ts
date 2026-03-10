import type { IChallengeLeaderboardRepository } from '../../application/read-models/i-challenge-leaderboard-repository.js';
import type { ChallengeLeaderboard } from '../../application/read-models/challenge-leaderboard.js';

export class InMemoryChallengeLeaderboardRepository implements IChallengeLeaderboardRepository {
  items: ChallengeLeaderboard[] = [];
  saveCount = 0;

  async save(leaderboard: ChallengeLeaderboard): Promise<void> {
    this.saveCount++;
    const index = this.items.findIndex((l) => l.challengeId === leaderboard.challengeId);
    if (index >= 0) {
      this.items[index] = leaderboard;
    } else {
      this.items.push(leaderboard);
    }
  }

  async findByChallengeId(challengeId: string): Promise<ChallengeLeaderboard | null> {
    return this.items.find((l) => l.challengeId === challengeId) ?? null;
  }
}
