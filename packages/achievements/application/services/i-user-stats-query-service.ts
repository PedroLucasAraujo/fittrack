import type { DomainError } from '@fittrack/core';
import type { Either } from '@fittrack/core';

/**
 * Anti-corruption layer port for querying user statistics from other bounded contexts.
 *
 * Achievements does NOT access other module repositories directly (ADR-0005).
 * This interface provides a clean boundary — implementations query other
 * module databases or call internal APIs without leaking those details.
 */
export interface IUserStatsQueryService {
  /** Total number of CONFIRMED workouts for this user. */
  getWorkoutCount(userId: string): Promise<Either<DomainError, number>>;

  /** Current active streak in days for this user. */
  getCurrentStreakDays(userId: string): Promise<Either<DomainError, number>>;

  /** Days elapsed since the user account was created. */
  getUserAgeDays(userId: string): Promise<Either<DomainError, number>>;
}
