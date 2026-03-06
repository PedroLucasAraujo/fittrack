import type { AchievementEvaluator } from '../services/achievement-evaluator.js';
import { AchievementUnlockedEvent } from '../../domain/events/achievement-unlocked-event.js';
import { AchievementProgressUpdatedEvent } from '../../domain/events/achievement-progress-updated-event.js';
import { MetricType } from '../../domain/value-objects/achievement-metric-type.js';
import type { IAchievementEventPublisher } from '../ports/i-achievement-event-publisher.js';
import type { IUserStatsQueryService } from '../services/i-user-stats-query-service.js';

/**
 * Payload from the ExecutionRecorded event emitted by the Execution bounded context.
 * Only the fields needed by this handler are declared here (ADR-0005).
 */
export interface ExecutionRecordedPayload {
  userId: string;
  professionalProfileId: string;
  executionId: string;
}

/**
 * Handles ExecutionRecorded events from the Execution bounded context.
 *
 * ## Responsibility
 * When a workout execution is completed (confirmed), increments the workout_count
 * metric for achievements and evaluates which achievements should be unlocked.
 *
 * ## Bounded context isolation (ADR-0005)
 * Does NOT import from @fittrack/execution. Receives payload as plain DTO.
 * Queries workout count via IUserStatsQueryService (anti-corruption layer).
 *
 * ## Event sourcing (ADR-0009 §4)
 * This handler is called by the infrastructure event bus subscription.
 * After evaluation, publishes AchievementUnlockedEvent for each newly unlocked achievement.
 */
export class OnWorkoutExecutionCompleted {
  constructor(
    private readonly evaluator: AchievementEvaluator,
    private readonly userStatsService: IUserStatsQueryService,
    private readonly eventPublisher: IAchievementEventPublisher,
  ) {}

  async handle(payload: ExecutionRecordedPayload): Promise<void> {
    const metricResult = MetricType.create('workout_count');
    /* v8 ignore next */
    if (metricResult.isLeft()) return;

    // Query current workout count via anti-corruption layer
    const countResult = await this.userStatsService.getWorkoutCount(payload.userId);
    if (countResult.isLeft()) return;

    const evaluationResults = await this.evaluator.evaluateForUser(
      payload.userId,
      metricResult.value,
      countResult.value,
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
