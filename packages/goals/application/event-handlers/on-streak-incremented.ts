import type { UpdateGoalProgress } from '../use-cases/update-goal-progress.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';

/**
 * Payload from the StreakIncrementedEvent emitted by the Gamification context.
 */
export interface StreakIncrementedForGoalsPayload {
  readonly userId: string;
  readonly currentStreak: number;
}

/**
 * Event handler: subscribes to `StreakIncremented` from the Gamification context.
 * Updates active STREAK_DAYS goals for the user (ADR-0068 §5).
 */
export class OnStreakIncremented {
  constructor(
    private readonly goalRepo: IGoalRepository,
    private readonly updateGoalProgress: UpdateGoalProgress,
  ) {}

  async handle(payload: StreakIncrementedForGoalsPayload): Promise<void> {
    const goals = await this.goalRepo.findActiveGoalsByMetric(payload.userId, 'STREAK_DAYS');

    for (const goal of goals) {
      const result = await this.updateGoalProgress.execute({
        goalId: goal.id,
        newValue: payload.currentStreak,
        source: 'METRIC',
      });
      if (result.isLeft()) {
        // eslint-disable-next-line no-console
        console.error(`[OnStreakIncremented] Failed to update goal progress: ${result.value.code}`);
      }
    }
  }
}
