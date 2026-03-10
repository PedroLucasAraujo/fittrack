import type { IChallengeRepository } from '../../domain/repositories/i-challenge-repository.js';
import type { IChallengeParticipationRepository } from '../../domain/repositories/i-challenge-participation-repository.js';
import type { IMetricsQueryService } from '../../domain/services/i-metrics-query-service.js';
import { UpdateChallengeProgressUseCase } from '../use-cases/update-challenge-progress-use-case.js';

/**
 * Handles WorkoutExecutionRecorded events and fans out progress updates to all
 * active WORKOUT_COUNT challenges the user participates in.
 *
 * ## Idempotency
 *
 * Progress is derived from `IMetricsQueryService.getWorkoutCountSince(userId, joinedAtUtc)`
 * rather than incrementing the stored counter by +1. Because the metrics service
 * always returns the current absolute count, redelivering the same event produces
 * the same result (the absolute count doesn't change between deliveries).
 *
 * This is safe because `ChallengeParticipation.updateProgress()` rejects
 * progress decreases, so a duplicate delivery with the same absolute value is a no-op.
 */
export interface WorkoutExecutionRecordedEventPayload {
  userId: string;
  executionId: string;
}

export class OnWorkoutExecutionRecorded {
  constructor(
    private readonly challengeRepo: IChallengeRepository,
    private readonly participationRepo: IChallengeParticipationRepository,
    private readonly metricsService: IMetricsQueryService,
    private readonly updateProgress: UpdateChallengeProgressUseCase,
  ) {}

  async handle(event: WorkoutExecutionRecordedEventPayload): Promise<void> {
    const challenges = await this.challengeRepo.findActive();
    const relevant = challenges.filter((c) => c.goalMetricType === 'WORKOUT_COUNT');

    for (const challenge of relevant) {
      const participation = await this.participationRepo.findByChallengeAndUser(
        challenge.id,
        event.userId,
      );
      if (!participation) continue;
      if (participation.hasCompleted()) continue;

      // Use absolute count from metrics service (not currentProgress + 1) so that
      // redelivery of this event is idempotent. The count is scoped to joinedAtUtc
      // so only workouts recorded after joining count toward the goal.
      const absoluteCount = await this.metricsService.getWorkoutCountSince(
        event.userId,
        participation.joinedAtUtc,
      );

      await this.updateProgress.execute({
        challengeId: challenge.id,
        userId: event.userId,
        metricType: 'WORKOUT_COUNT',
        newProgressValue: absoluteCount,
      });
    }
  }
}
