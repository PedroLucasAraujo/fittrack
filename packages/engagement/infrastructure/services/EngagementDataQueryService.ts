import { right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { IEngagementDataQueryService } from '../../domain/services/IEngagementDataQueryService.js';

/**
 * ACL implementation of IEngagementDataQueryService (ADR-0005).
 *
 * Queries multiple bounded contexts (Execution, Self-Log, Scheduling,
 * Gamification, Goals) and translates their data into Engagement's language.
 *
 * Constructor receives repository interfaces from each source module so that
 * the Engagement domain layer remains free of direct module dependencies.
 *
 * TODO: Implement each method with real repository queries once cross-module
 * wiring is in place. Currently returns safe zero defaults to allow tests
 * of the domain and application layers in isolation.
 */
export class EngagementDataQueryService implements IEngagementDataQueryService {
  constructor(
    // Each repository comes from its respective module's public interface.
    // Typed as `any` here to avoid tight coupling at compile time.
    // Wire concrete types at the composition root (infrastructure/DI layer).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly executionRepo: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly selfLogRepo: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly bookingRepo: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly streakTrackerRepo: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly goalRepo: any,
  ) {}

  async getWorkoutsInWindow(
    _userId: string,
    _startDate: string,
    _endDate: string,
  ): Promise<DomainResult<number>> {
    // TODO: executionRepo.countByClientAndDateRange(userId, startDate, endDate)
    return right(0);
  }

  async getDaysWithNutritionLog(
    _userId: string,
    _windowDays: number,
  ): Promise<DomainResult<number>> {
    // TODO: selfLogRepo.countDistinctDaysInWindow(userId, windowDays)
    return right(0);
  }

  async getNutritionLogsInWindow(
    _userId: string,
    _startDate: string,
    _endDate: string,
  ): Promise<DomainResult<number>> {
    // TODO: selfLogRepo.countByClientAndDateRange(userId, startDate, endDate)
    return right(0);
  }

  async getBookingsAttendedInWindow(
    _userId: string,
    _startDate: string,
    _endDate: string,
  ): Promise<DomainResult<number>> {
    // TODO: bookingRepo.countCompletedByClientAndDateRange(userId, startDate, endDate)
    return right(0);
  }

  async getCurrentStreak(_userId: string): Promise<DomainResult<number>> {
    // TODO: streakTrackerRepo.findByUserId(userId) → tracker.currentStreak.value
    return right(0);
  }

  async getActiveGoalsCount(_userId: string): Promise<DomainResult<number>> {
    // TODO: goalRepo.findActiveByClient(userId) → goals.length
    return right(0);
  }

  async getGoalsOnTrackCount(_userId: string): Promise<DomainResult<number>> {
    // TODO: goalRepo.findActiveByClient(userId) → goals.filter(g => g.isOnTrack()).length
    return right(0);
  }

  async getLastActivityDate(_userId: string): Promise<DomainResult<string | null>> {
    // TODO: max(lastExecution, lastSelfLog, lastBooking) dates
    return right(null);
  }

  async getDaysInactive(_userId: string): Promise<DomainResult<number>> {
    // TODO: derived from getLastActivityDate
    return right(0);
  }
}
