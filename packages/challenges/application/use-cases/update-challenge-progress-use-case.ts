import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import {
  ChallengeNotFoundError,
  ChallengeNotActiveError,
  NotParticipantError,
} from '../../domain/errors/index.js';
import { ChallengeProgressUpdatedEvent } from '../../domain/events/challenge-progress-updated-event.js';
import { ChallengeParticipantCompletedEvent } from '../../domain/events/challenge-participant-completed-event.js';
import type { IChallengeRepository } from '../../domain/repositories/i-challenge-repository.js';
import type { IChallengeParticipationRepository } from '../../domain/repositories/i-challenge-participation-repository.js';
import type { IChallengesEventPublisher } from '../ports/i-challenges-event-publisher.js';
import type {
  UpdateChallengeProgressInputDTO,
  UpdateChallengeProgressOutputDTO,
} from '../dtos/update-challenge-progress-dto.js';

export type UpdateChallengeProgressSkipped = {
  type: 'skipped';
  reason: 'metric_mismatch';
  currentProgress: number;
  progressPercentage: number;
  completedGoal: boolean;
};

export type UpdateChallengeProgressResult =
  | UpdateChallengeProgressOutputDTO
  | UpdateChallengeProgressSkipped;

export class UpdateChallengeProgressUseCase {
  constructor(
    private readonly challengeRepo: IChallengeRepository,
    private readonly participationRepo: IChallengeParticipationRepository,
    private readonly publisher: IChallengesEventPublisher,
  ) {}

  async execute(
    dto: UpdateChallengeProgressInputDTO,
  ): Promise<DomainResult<UpdateChallengeProgressResult>> {
    const challenge = await this.challengeRepo.findById(dto.challengeId);
    if (!challenge) {
      return left(new ChallengeNotFoundError());
    }

    if (!challenge.isActive()) {
      return left(new ChallengeNotActiveError());
    }

    const participation = await this.participationRepo.findByChallengeAndUser(
      dto.challengeId,
      dto.userId,
    );
    if (!participation) {
      return left(new NotParticipantError());
    }

    // Metric type mismatch: return a discriminated 'skipped' outcome so callers
    // can distinguish a no-op skip from a genuine update without checking the error type.
    if (challenge.goalMetricType !== dto.metricType) {
      return right({
        type: 'skipped',
        reason: 'metric_mismatch',
        currentProgress: participation.currentProgress,
        progressPercentage: participation.progressPercentage,
        completedGoal: participation.hasCompleted(),
      });
    }

    const previousProgress = participation.currentProgress;

    const updateResult = participation.updateProgress(
      dto.newProgressValue,
      challenge.goalTargetValue,
    );
    if (updateResult.isLeft()) return left(updateResult.value);
    const outcome = updateResult.value;

    // Progress value did not change (e.g. at-least-once redelivery with same absolute value).
    // Skip save and event publish — the final state is already correct.
    if (outcome.type === 'no_change') {
      return right({
        type: 'skipped',
        reason: 'metric_mismatch', // reuse the skipped discriminant; no duplicate event emitted
        currentProgress: participation.currentProgress,
        progressPercentage: participation.progressPercentage,
        completedGoal: participation.hasCompleted(),
      });
    }

    // ADR-0047 §4 — events are published after save() confirms persistence
    await this.participationRepo.save(participation);

    await this.publisher.publishProgressUpdated(
      new ChallengeProgressUpdatedEvent(participation.id, dto.userId, {
        challengeId: dto.challengeId,
        userId: dto.userId,
        previousProgress,
        currentProgress: participation.currentProgress,
        progressPercentage: participation.progressPercentage,
        updatedAtUtc: participation.lastProgressUpdateAtUtc.toISOString(),
      }),
    );

    if (outcome.completedGoal) {
      await this.publisher.publishParticipantCompleted(
        new ChallengeParticipantCompletedEvent(participation.id, dto.userId, {
          challengeId: dto.challengeId,
          userId: dto.userId,
          completedAtUtc: outcome.completedAtUtc.toISOString(),
          finalProgress: participation.currentProgress,
        }),
      );
    }

    return right({
      currentProgress: participation.currentProgress,
      progressPercentage: participation.progressPercentage,
      completedGoal: outcome.completedGoal,
    });
  }

  /**
   * Fan-out helper: finds all active challenges for the given metric type,
   * checks if the user participates in each, and calls execute() for every
   * incomplete participation.
   *
   * Used by event handlers (OnMetricComputed, OnStreakIncremented) to avoid
   * duplicating repo dependencies. All repo instances are shared with execute(),
   * so there is no risk of stale reads across different DI-scoped instances.
   */
  async executeFanOut(userId: string, metricType: string, newProgressValue: number): Promise<void> {
    const challenges = await this.challengeRepo.findActive();
    const relevant = challenges.filter((c) => c.goalMetricType === metricType);

    for (const challenge of relevant) {
      const participation = await this.participationRepo.findByChallengeAndUser(
        challenge.id,
        userId,
      );
      if (!participation || participation.hasCompleted()) continue;

      await this.execute({
        challengeId: challenge.id,
        userId,
        metricType,
        newProgressValue,
      });
    }
  }
}
