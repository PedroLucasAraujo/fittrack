import { right } from '@fittrack/core';
import type { Either, DomainError } from '@fittrack/core';
import type { IUserAchievementProgressRepository } from '../../domain/repositories/i-user-achievement-progress-repository.js';
import type { UserAchievementProgress } from '../../domain/aggregates/user-achievement-progress.js';

export class InMemoryUserAchievementProgressRepository
  implements IUserAchievementProgressRepository
{
  private store = new Map<string, UserAchievementProgress>();

  async save(progress: UserAchievementProgress): Promise<Either<DomainError, void>> {
    this.store.set(progress.id, progress);
    return right(undefined);
  }

  async findById(id: string): Promise<Either<DomainError, UserAchievementProgress | null>> {
    return right(this.store.get(id) ?? null);
  }

  async findByUserId(userId: string): Promise<Either<DomainError, UserAchievementProgress[]>> {
    const result = Array.from(this.store.values()).filter((p) => p.userId === userId);
    return right(result);
  }

  async findUnlockedByUserId(
    userId: string,
  ): Promise<Either<DomainError, UserAchievementProgress[]>> {
    const result = Array.from(this.store.values()).filter(
      (p) => p.userId === userId && p.isUnlocked(),
    );
    return right(result);
  }

  async findInProgressByUserId(
    userId: string,
  ): Promise<Either<DomainError, UserAchievementProgress[]>> {
    const result = Array.from(this.store.values()).filter(
      (p) => p.userId === userId && !p.isUnlocked(),
    );
    return right(result);
  }

  async findByUserAndDefinition(
    userId: string,
    achievementDefinitionId: string,
  ): Promise<Either<DomainError, UserAchievementProgress | null>> {
    for (const progress of this.store.values()) {
      if (
        progress.userId === userId &&
        progress.achievementDefinitionId === achievementDefinitionId
      ) {
        return right(progress);
      }
    }
    return right(null);
  }

  async existsByUserAndDefinition(
    userId: string,
    achievementDefinitionId: string,
  ): Promise<Either<DomainError, boolean>> {
    for (const progress of this.store.values()) {
      if (
        progress.userId === userId &&
        progress.achievementDefinitionId === achievementDefinitionId
      ) {
        return right(true);
      }
    }
    return right(false);
  }

  /** Test helper. */
  get size(): number {
    return this.store.size;
  }

  all(): UserAchievementProgress[] {
    return Array.from(this.store.values());
  }
}
