import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidUserIdError } from '../../domain/errors/invalid-user-id-error.js';
import type { IStreakTrackerRepository } from '../../domain/repositories/i-streak-tracker-repository.js';
import type {
  GetStreakStatusInputDTO,
  GetStreakStatusOutputDTO,
} from '../dtos/get-streak-status-dto.js';

/** UUIDv4 regex. */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns the current streak status for a user.
 *
 * If no StreakTracker exists yet (user has never had a confirmed Execution),
 * returns a zeroed DTO rather than an error — the user simply has no streak.
 *
 * This is a read-only use case; it has no side effects.
 */
export class GetStreakStatus {
  constructor(private readonly repo: IStreakTrackerRepository) {}

  async execute(dto: GetStreakStatusInputDTO): Promise<DomainResult<GetStreakStatusOutputDTO>> {
    // 1. Validate userId
    if (!UUID_V4_REGEX.test(dto.userId)) {
      return left(new InvalidUserIdError());
    }

    // 2. Load tracker
    const tracker = await this.repo.findByUserId(dto.userId);

    // 3. No tracker → zeroed response (user has never exercised)
    if (tracker === null) {
      return right({
        currentStreak: 0,
        longestStreak: 0,
        freezeTokenCount: 0,
        daysUntilNextFreezeToken: 7,
        isActive: false,
        isAtRisk: false,
        lastActivityDay: null,
        streakStartDay: null,
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    return right({
      currentStreak: tracker.currentStreak,
      longestStreak: tracker.longestStreak,
      freezeTokenCount: tracker.freezeTokenCount,
      daysUntilNextFreezeToken: tracker.daysUntilNextFreezeToken(),
      isActive: tracker.currentStreak > 0,
      isAtRisk: tracker.isAtRisk(todayStr),
      lastActivityDay: tracker.lastActivityDay,
      streakStartDay: tracker.streakStartDay,
    });
  }
}
