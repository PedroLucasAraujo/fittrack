import type { DomainResult } from '@fittrack/core';

/**
 * Anti-Corruption Layer (ACL) interface for cross-module data queries (ADR-0005).
 *
 * The Engagement domain defines this interface. The infrastructure layer
 * implements it by querying the concrete repositories of other modules:
 * Execution, Self-Log, Scheduling, Gamification, and Goals.
 *
 * ## Why ACL?
 * Engagement must aggregate data from five other bounded contexts. Direct
 * imports of other modules' repositories would create tight coupling and
 * violate bounded context isolation. The ACL translates foreign concepts
 * into Engagement's own language.
 *
 * ## Implementation notes
 * - All dates are ISO 8601 strings (ADR-0010 — UTC).
 * - On infrastructure errors the implementation returns Left(DomainError).
 * - Results are counts/primitives only — never domain objects from other modules.
 */
export interface IEngagementDataQueryService {
  /**
   * Returns the number of confirmed workout executions in the given window.
   * Source: Execution module (ExecutionRecordedEvent, status=CONFIRMED).
   */
  getWorkoutsInWindow(userId: string, startDate: string, endDate: string): Promise<DomainResult<number>>;

  /**
   * Returns the number of days (within the last `windowDays` days) on which
   * the user created at least one nutrition/self-log entry.
   * Source: Self-Log module.
   */
  getDaysWithNutritionLog(userId: string, windowDays: number): Promise<DomainResult<number>>;

  /**
   * Returns the total count of self-log entries in the given window.
   * Source: Self-Log module.
   */
  getNutritionLogsInWindow(userId: string, startDate: string, endDate: string): Promise<DomainResult<number>>;

  /**
   * Returns the number of bookings the user attended (status=COMPLETED)
   * in the given window. Excludes NO_SHOW and CANCELLED.
   * Source: Scheduling module.
   */
  getBookingsAttendedInWindow(userId: string, startDate: string, endDate: string): Promise<DomainResult<number>>;

  /**
   * Returns the user's current streak value (consecutive active days).
   * Source: Gamification module (StreakTracker — ADR-0066). Does NOT
   * duplicate streak logic.
   */
  getCurrentStreak(userId: string): Promise<DomainResult<number>>;

  /**
   * Returns the total count of active (non-abandoned, non-completed) goals.
   * Source: Goals module.
   */
  getActiveGoalsCount(userId: string): Promise<DomainResult<number>>;

  /**
   * Returns the count of active goals that are currently on track
   * (Goal.isOnTrack() === true).
   * Source: Goals module.
   */
  getGoalsOnTrackCount(userId: string): Promise<DomainResult<number>>;

  /**
   * Returns the ISO 8601 date string of the user's most recent recorded
   * activity across all modules (workout, nutrition log, booking).
   * Returns null if the user has never had any activity.
   * Source: Multi-module (max date across Execution, Self-Log, Scheduling).
   */
  getLastActivityDate(userId: string): Promise<DomainResult<string | null>>;

  /**
   * Returns the number of days since the user's last activity.
   * Returns a large sentinel value (e.g. 999) if the user never had activity.
   * Source: Derived from getLastActivityDate.
   */
  getDaysInactive(userId: string): Promise<DomainResult<number>>;
}
