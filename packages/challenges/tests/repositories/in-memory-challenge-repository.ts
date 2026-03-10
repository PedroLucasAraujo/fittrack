import type {
  IChallengeRepository,
  ActiveChallengeFilters,
} from '../../domain/repositories/i-challenge-repository.js';
import type { Challenge } from '../../domain/aggregates/challenge.js';

export class InMemoryChallengeRepository implements IChallengeRepository {
  items: Challenge[] = [];
  saveCount = 0;

  async save(challenge: Challenge): Promise<void> {
    this.saveCount++;
    const index = this.items.findIndex((c) => c.id === challenge.id);
    if (index >= 0) {
      this.items[index] = challenge;
    } else {
      this.items.push(challenge);
    }
  }

  async findById(id: string): Promise<Challenge | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }

  async findActive(filters?: ActiveChallengeFilters): Promise<Challenge[]> {
    let result = this.items.filter((c) => c.isActive());
    if (filters?.visibility) {
      result = result.filter((c) => c.visibility === filters.visibility);
    }
    if (filters?.type) {
      result = result.filter((c) => c.type === filters.type);
    }
    return result;
  }

  async findByCreator(creatorId: string): Promise<Challenge[]> {
    return this.items.filter((c) => c.createdBy === creatorId);
  }

  async findEnded(): Promise<Challenge[]> {
    return this.items.filter((c) => c.hasEnded());
  }

  async findPublic(): Promise<Challenge[]> {
    return this.items.filter((c) => c.visibility === 'PUBLIC');
  }
}
