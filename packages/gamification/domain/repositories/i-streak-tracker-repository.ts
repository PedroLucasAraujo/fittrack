import type { StreakTracker } from '../aggregates/streak-tracker.js';

/**
 * Repository contract for the StreakTracker aggregate (ADR-0047).
 *
 * Implementations live in the infrastructure layer.
 * All methods are async — they may involve I/O.
 */
export interface IStreakTrackerRepository {
  /**
   * Persists a StreakTracker (insert on creation, update on subsequent saves).
   * The implementation handles optimistic locking via the `version` field (ADR-0006).
   */
  save(tracker: StreakTracker): Promise<void>;

  /**
   * Returns the StreakTracker for a given userId, or null if none exists.
   * The gamification domain is user-scoped; no tenant scoping is needed here.
   */
  findByUserId(userId: string): Promise<StreakTracker | null>;

  /**
   * Returns all StreakTrackers whose currentStreak > 0.
   * Used by CheckStreakIntegrityUseCase to scope work to active streaks.
   */
  findAllActive(): Promise<StreakTracker[]>;
}
