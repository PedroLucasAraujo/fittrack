import type { AchievementEvaluator } from '../services/achievement-evaluator.js';
import { AchievementUnlockedEvent } from '../../domain/events/achievement-unlocked-event.js';
import { AchievementProgressUpdatedEvent } from '../../domain/events/achievement-progress-updated-event.js';
import { MetricType } from '../../domain/value-objects/achievement-metric-type.js';
import type { IAchievementEventPublisher } from '../ports/i-achievement-event-publisher.js';

/**
 * Payload from the StreakMetricComputed event emitted by the Metrics bounded context.
 */
export interface StreakMetricComputedPayload {
  userId: string;
  streakDays: number;
}

/**
 * Handles StreakMetricComputed events from the Metrics bounded context.
 *
 * ## Responsibility
 * When a streak metric is computed, evaluates streak-based achievements
 * (STREAK_7_DAYS, STREAK_30_DAYS) for the user.
 *
 * ## Bounded context isolation (ADR-0005)
 * Does NOT import from @fittrack/metrics. Receives payload as plain DTO.
 * The streakDays value is provided directly in the event payload.
 */
export class OnStreakMetricComputed {
  constructor(
    private readonly evaluator: AchievementEvaluator,
    private readonly eventPublisher: IAchievementEventPublisher,
  ) {}

  async handle(payload: StreakMetricComputedPayload): Promise<void> {
    const metricResult = MetricType.create('streak_days');
    /* v8 ignore next */
    if (metricResult.isLeft()) return;

    const evaluationResults = await this.evaluator.evaluateForUser(
      payload.userId,
      metricResult.value,
      payload.streakDays,
    );

    if (evaluationResults.isLeft()) return;

    // Publish unlock events for newly unlocked achievements
    for (const result of evaluationResults.value) {
      if (!result.wasUnlocked) continue;

      const { progress } = result;
      /* v8 ignore next */
      if (!progress.unlockedAtUtc) continue;

      await this.eventPublisher.publishAchievementUnlocked(
        new AchievementUnlockedEvent(progress.id, '', {
          progressId: progress.id,
          userId: payload.userId,
          achievementDefinitionId: progress.achievementDefinitionId,
          achievementCode: progress.achievementCode,
          achievementName: progress.achievementCode,
          achievementCategory: progress.achievementCategory,
          achievementTier: progress.achievementTier,
          unlockedAtUtc: progress.unlockedAtUtc,
        }),
      );
    }

    // Publish progress update events for non-unlock progress changes
    for (const result of evaluationResults.value) {
      if (!result.wasProgressUpdated || result.wasUnlocked) continue;

      const { progress } = result;
      await this.eventPublisher.publishAchievementProgressUpdated(
        new AchievementProgressUpdatedEvent(progress.id, '', {
          progressId: progress.id,
          userId: payload.userId,
          achievementDefinitionId: progress.achievementDefinitionId,
          achievementCode: progress.achievementCode,
          oldValue: result.oldValue,
          newValue: result.newValue,
          progressPercentage: progress.progressPercentage().value,
        }),
      );
    }
  }
}
