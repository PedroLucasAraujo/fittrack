/**
 * Anti-corruption layer port for querying Execution data from outside the
 * Gamification bounded context (ADR-0005, ADR-0047).
 *
 * The Gamification domain MUST NOT import from @fittrack/execution.
 * This port decouples the anti-fraud integrity check from the Execution context.
 *
 * Used by: `CheckStreakIntegrityUseCase`
 */
export interface IGamificationExecutionQueryService {
  /**
   * Returns the set of unique YYYY-MM-DD UTC dates on which a user had at
   * least one confirmed Execution within the given window (inclusive).
   *
   * @param userId        UUIDv4 of the user.
   * @param windowStart   YYYY-MM-DD UTC — start of the query window (inclusive).
   * @param windowEnd     YYYY-MM-DD UTC — end of the query window (inclusive).
   */
  getActivityDaysForUser(userId: string, windowStart: string, windowEnd: string): Promise<string[]>;
}
