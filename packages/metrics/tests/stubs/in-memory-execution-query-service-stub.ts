import type {
  IExecutionQueryService,
  ExecutionSummary,
} from '../../application/ports/execution-query-service-port.js';
import { generateId } from '@fittrack/core';

export class InMemoryExecutionQueryServiceStub implements IExecutionQueryService {
  /** Override to control what summary getWeeklyExecutionSummary returns. */
  weeklyExecutionSummary: ExecutionSummary = {
    workoutCount: 0,
    totalVolume: 0,
    totalSets: 0,
    uniqueExercises: 0,
    sourceExecutionIds: [],
  };

  /** Override to control what dates getActivityDatesInWindow returns. */
  activityDates: string[] = [];

  /** Set to non-null to make the service throw an error. */
  errorToThrow: Error | null = null;

  async getWeeklyExecutionSummary(
    _userId: string,
    _weekStartDate: string,
    _weekEndDate: string,
  ): Promise<ExecutionSummary> {
    if (this.errorToThrow) throw this.errorToThrow;
    return { ...this.weeklyExecutionSummary };
  }

  async getActivityDatesInWindow(
    _userId: string,
    _startDate: string,
    _endDate: string,
  ): Promise<string[]> {
    if (this.errorToThrow) throw this.errorToThrow;
    return [...this.activityDates];
  }

  /** Convenience: set up a typical weekly summary with N workouts. */
  setupWeekWithWorkouts(count: number, volumePerWorkout = 1000): void {
    const ids = Array.from({ length: count }, () => generateId());
    this.weeklyExecutionSummary = {
      workoutCount: count,
      totalVolume: count * volumePerWorkout,
      totalSets: count * 3,
      uniqueExercises: count * 2,
      sourceExecutionIds: ids,
    };
  }
}
