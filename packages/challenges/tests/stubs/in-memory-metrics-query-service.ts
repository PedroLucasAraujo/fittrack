import type { IMetricsQueryService } from '../../domain/services/i-metrics-query-service.js';

export class InMemoryMetricsQueryService implements IMetricsQueryService {
  workoutCount = 0;
  totalVolume = 0;
  streakDays = 0;
  nutritionLogCount = 0;

  async getWorkoutCountSince(_userId: string, _sinceUtc: Date): Promise<number> {
    return this.workoutCount;
  }

  async getTotalVolumeSince(_userId: string, _sinceUtc: Date): Promise<number> {
    return this.totalVolume;
  }

  async getStreakDaysSince(_userId: string, _sinceUtc: Date): Promise<number> {
    return this.streakDays;
  }

  async getNutritionLogCountSince(_userId: string, _sinceUtc: Date): Promise<number> {
    return this.nutritionLogCount;
  }
}
