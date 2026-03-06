import type { DomainError } from '@fittrack/core';
import type { Either } from '@fittrack/core';
import type { UserAchievementProgress } from '../aggregates/user-achievement-progress.js';

export interface IUserAchievementProgressRepository {
  save(progress: UserAchievementProgress): Promise<Either<DomainError, void>>;

  findById(id: string): Promise<Either<DomainError, UserAchievementProgress | null>>;

  /** Returns all progress records for a user (locked, in-progress, and unlocked). */
  findByUserId(userId: string): Promise<Either<DomainError, UserAchievementProgress[]>>;

  /** Returns only unlocked progress records for a user. */
  findUnlockedByUserId(userId: string): Promise<Either<DomainError, UserAchievementProgress[]>>;

  /** Returns only non-unlocked (in-progress or not started) progress records for a user. */
  findInProgressByUserId(userId: string): Promise<Either<DomainError, UserAchievementProgress[]>>;

  /**
   * Returns the progress record for a specific user + definition pair, or null if none exists.
   */
  findByUserAndDefinition(
    userId: string,
    achievementDefinitionId: string,
  ): Promise<Either<DomainError, UserAchievementProgress | null>>;

  /**
   * Returns true when a progress record already exists for this user + definition.
   */
  existsByUserAndDefinition(
    userId: string,
    achievementDefinitionId: string,
  ): Promise<Either<DomainError, boolean>>;
}
