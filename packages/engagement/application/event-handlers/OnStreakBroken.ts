import type { CalculateUserEngagementUseCase } from '../use-cases/CalculateUserEngagementUseCase.js';

/** Minimum previous streak (days) to trigger an immediate recalculation. */
const LONG_STREAK_THRESHOLD = 30;

/**
 * Handles StreakBrokenEvent from the Gamification module (ADR-0009).
 *
 * Breaking a long streak (≥30 days) is a critical churn risk signal.
 * When that happens, this handler triggers an IMMEDIATE engagement
 * recalculation instead of waiting for the daily batch job, so that
 * `UserDisengagedEvent` (if applicable) can be emitted promptly and
 * any downstream notifications are not delayed by up to 24 hours.
 *
 * For short streaks (<30 days) the daily job is sufficient.
 */
export class OnStreakBroken {
  constructor(
    private readonly calculateEngagement: CalculateUserEngagementUseCase,
  ) {}

  async handle(payload: {
    userId: string;
    professionalProfileId: string;
    previousStreak: number;
  }): Promise<void> {
    if (payload.previousStreak < LONG_STREAK_THRESHOLD) {
      return;
    }

    const result = await this.calculateEngagement.execute({
      userId: payload.userId,
      professionalProfileId: payload.professionalProfileId,
    });

    if (result.isLeft()) {
      console.error('[OnStreakBroken] Engagement recalculation failed', {
        error: result.value.message,
      });
    }
  }
}
