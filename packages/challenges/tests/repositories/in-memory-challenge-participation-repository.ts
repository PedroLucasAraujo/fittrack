import type { IChallengeParticipationRepository } from '../../domain/repositories/i-challenge-participation-repository.js';
import type { ChallengeParticipation } from '../../domain/aggregates/challenge-participation.js';

export class InMemoryChallengeParticipationRepository implements IChallengeParticipationRepository {
  items: ChallengeParticipation[] = [];
  saveCount = 0;

  async save(participation: ChallengeParticipation): Promise<void> {
    this.saveCount++;
    const index = this.items.findIndex((p) => p.id === participation.id);
    if (index >= 0) {
      this.items[index] = participation;
    } else {
      this.items.push(participation);
    }
  }

  async findById(id: string): Promise<ChallengeParticipation | null> {
    return this.items.find((p) => p.id === id) ?? null;
  }

  async findByChallenge(challengeId: string): Promise<ChallengeParticipation[]> {
    return this.items.filter((p) => p.challengeId === challengeId);
  }

  async findByUser(userId: string): Promise<ChallengeParticipation[]> {
    return this.items.filter((p) => p.userId === userId);
  }

  async findByChallengeAndUser(
    challengeId: string,
    userId: string,
  ): Promise<ChallengeParticipation | null> {
    return this.items.find((p) => p.challengeId === challengeId && p.userId === userId) ?? null;
  }

  async countByChallenge(challengeId: string): Promise<number> {
    return this.items.filter((p) => p.challengeId === challengeId).length;
  }

  async countCompletedByChallenge(challengeId: string): Promise<number> {
    return this.items.filter((p) => p.challengeId === challengeId && p.hasCompleted()).length;
  }
}
