import { UpdateChallengeProgressUseCase } from '../use-cases/update-challenge-progress-use-case.js';

/**
 * Handles StreakIncremented events from the Gamification bounded context and
 * fans out progress updates to all active STREAK_DAYS challenges.
 *
 * ## Idempotency
 *
 * `currentStreak` is an absolute value (current streak length), not a delta.
 * Redelivering the same event yields the same streak value, which is rejected
 * as a no-op by UpdateChallengeProgressUseCase (progress cannot decrease).
 */
export interface StreakIncrementedEventPayload {
  userId: string;
  currentStreak: number;
}

export class OnStreakIncremented {
  constructor(private readonly updateProgress: UpdateChallengeProgressUseCase) {}

  async handle(event: StreakIncrementedEventPayload): Promise<void> {
    await this.updateProgress.executeFanOut(event.userId, 'STREAK_DAYS', event.currentStreak);
  }
}
