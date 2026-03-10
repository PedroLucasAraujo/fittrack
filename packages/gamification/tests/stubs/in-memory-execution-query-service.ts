import type { IGamificationExecutionQueryService } from '../../application/ports/i-gamification-execution-query-service.js';

export class InMemoryExecutionQueryService implements IGamificationExecutionQueryService {
  /** Map of userId → list of YYYY-MM-DD activity days to return. */
  private activityDaysByUser: Map<string, string[]> = new Map();

  setActivityDays(userId: string, days: string[]): void {
    this.activityDaysByUser.set(userId, days);
  }

  async getActivityDaysForUser(
    userId: string,
    _windowStart: string,
    _windowEnd: string,
  ): Promise<string[]> {
    return this.activityDaysByUser.get(userId) ?? [];
  }
}
