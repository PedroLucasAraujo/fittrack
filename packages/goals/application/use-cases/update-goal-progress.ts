import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found-error.js';
import { UnauthorizedProfessionalError } from '../../domain/errors/unauthorized-professional-error.js';
import { ProgressEntry } from '../../domain/entities/progress-entry.js';
import { GoalProgressUpdatedEvent } from '../../domain/events/goal-progress-updated-event.js';
import { GoalProgressRegressedEvent } from '../../domain/events/goal-progress-regressed-event.js';
import { GoalMilestoneReachedEvent } from '../../domain/events/goal-milestone-reached-event.js';
import { GoalTargetReachedEvent } from '../../domain/events/goal-target-reached-event.js';
import { GoalOffTrackEvent } from '../../domain/events/goal-off-track-event.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';
import type { IGoalsEventPublisher } from '../ports/i-goals-event-publisher.js';
import type { UpdateGoalProgressInputDTO } from '../dtos/index.js';
import { UUID_V4_REGEX } from '../shared/uuid-regex.js';

/**
 * Records a new progress data point for a goal.
 * Called both by manual requests and by event handlers (automated updates).
 */
export class UpdateGoalProgress {
  constructor(
    private readonly repo: IGoalRepository,
    private readonly publisher: IGoalsEventPublisher,
  ) {}

  async execute(dto: UpdateGoalProgressInputDTO): Promise<DomainResult<void>> {
    if (!UUID_V4_REGEX.test(dto.goalId)) {
      return left(new GoalNotFoundError());
    }

    const goal = await this.repo.findById(dto.goalId);
    if (!goal) return left(new GoalNotFoundError());

    // Tenant isolation for manual updates (ADR-0025).
    // Event-driven updates (METRIC, ASSESSMENT) are pre-filtered by clientId in event handlers.
    if (dto.source === 'MANUAL') {
      if (
        !dto.recordedBy ||
        (dto.recordedBy !== goal.clientId && dto.recordedBy !== goal.professionalProfileId)
      ) {
        return left(new UnauthorizedProfessionalError());
      }
    }

    // Create immutable progress entry.
    const entryResult = ProgressEntry.create({
      value: dto.newValue,
      unit: goal.unit,
      source: dto.source,
      recordedBy: dto.recordedBy ?? null,
      notes: dto.notes ?? null,
    });
    if (entryResult.isLeft()) return left(entryResult.value);

    // Apply domain transition.
    const outcomeResult = goal.recordProgress(entryResult.value);
    if (outcomeResult.isLeft()) return left(outcomeResult.value);
    const outcome = outcomeResult.value;

    await this.repo.save(goal);

    // Publish events post-commit (ADR-0009 §4).
    await this.publisher.publishGoalProgressUpdated(
      new GoalProgressUpdatedEvent(goal.id, goal.professionalProfileId, {
        clientId: goal.clientId,
        currentValue: outcome.currentValue,
        progressPercentage: outcome.progressPercentage,
        source: outcome.source,
      }),
    );

    if (outcome.regressed && outcome.previousValue !== null) {
      await this.publisher.publishGoalProgressRegressed(
        new GoalProgressRegressedEvent(goal.id, goal.professionalProfileId, {
          clientId: goal.clientId,
          previousValue: outcome.previousValue,
          currentValue: outcome.currentValue,
        }),
      );
    }

    for (const ms of outcome.milestonesReached) {
      await this.publisher.publishGoalMilestoneReached(
        new GoalMilestoneReachedEvent(goal.id, goal.professionalProfileId, {
          clientId: goal.clientId,
          milestoneId: ms.milestoneId,
          milestoneName: ms.milestoneName,
          reachedValue: ms.reachedValue,
        }),
      );
    }

    if (outcome.targetReached) {
      await this.publisher.publishGoalTargetReached(
        new GoalTargetReachedEvent(goal.id, goal.professionalProfileId, {
          clientId: goal.clientId,
          finalValue: outcome.currentValue,
          targetValue: goal.targetValue,
          daysAhead: outcome.daysAheadOfSchedule,
        }),
      );
    }

    if (outcome.offTrack) {
      // daysRemaining() is non-null when offTrack=true because offTrack requires a targetDate
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const daysRemaining = goal.daysRemaining()!;
      await this.publisher.publishGoalOffTrack(
        new GoalOffTrackEvent(goal.id, goal.professionalProfileId, {
          clientId: goal.clientId,
          expectedProgress: outcome.expectedProgress,
          actualProgress: outcome.progressPercentage,
          daysRemaining,
        }),
      );
    }

    return right(undefined);
  }
}
