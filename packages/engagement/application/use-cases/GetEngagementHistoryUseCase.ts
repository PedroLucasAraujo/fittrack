import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidEngagementError } from '../../domain/errors/InvalidEngagementError.js';
import { EngagementNotFoundError } from '../../domain/errors/EngagementNotFoundError.js';
import type { IUserEngagementRepository } from '../../domain/repositories/IUserEngagementRepository.js';
import type {
  GetEngagementHistoryInputDTO,
  GetEngagementHistoryOutputDTO,
} from '../dtos/GetEngagementHistoryDTO.js';

const DEFAULT_WEEKS = 8;
const MAX_WEEKS = 12;

/**
 * Returns the weekly engagement history snapshots for a user.
 *
 * Read-only use case. Does not modify any aggregate.
 * History is stored within the UserEngagement aggregate (max 12 entries).
 */
export class GetEngagementHistoryUseCase {
  constructor(private readonly engagementRepo: IUserEngagementRepository) {}

  async execute(
    dto: GetEngagementHistoryInputDTO,
  ): Promise<DomainResult<GetEngagementHistoryOutputDTO>> {
    if (!dto.userId || dto.userId.trim().length === 0) {
      return left(new InvalidEngagementError('userId is required'));
    }

    const engagement = await this.engagementRepo.findByUser(dto.userId);
    if (!engagement) {
      return left(new EngagementNotFoundError(dto.userId));
    }

    const weeks = Math.min(dto.weeks ?? DEFAULT_WEEKS, MAX_WEEKS);
    const recentHistory = [...engagement.history].slice(-weeks);

    return right({
      userId: dto.userId,
      history: recentHistory.map((entry) => ({
        weekStartDate: entry.weekStartDate,
        weekEndDate: entry.weekEndDate,
        overallScore: entry.overallScore,
        engagementLevel: entry.engagementLevel,
        workoutScore: entry.workoutScore,
        habitScore: entry.habitScore,
        goalProgressScore: entry.goalProgressScore,
        streakScore: entry.streakScore,
        workoutsCompleted: entry.workoutsCompleted,
        nutritionLogsCreated: entry.nutritionLogsCreated,
        bookingsAttended: entry.bookingsAttended,
        currentStreak: entry.currentStreak,
      })),
    });
  }
}
