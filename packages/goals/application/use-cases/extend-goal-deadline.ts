import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found-error.js';
import { InvalidTargetDateError } from '../../domain/errors/invalid-target-date-error.js';
import { UnauthorizedProfessionalError } from '../../domain/errors/unauthorized-professional-error.js';
import { GoalDeadlineExtendedEvent } from '../../domain/events/goal-deadline-extended-event.js';
import { TargetDate } from '../../domain/value-objects/target-date.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';
import type { IGoalsEventPublisher } from '../ports/i-goals-event-publisher.js';
import type { ExtendGoalDeadlineInputDTO } from '../dtos/index.js';
import { UUID_V4_REGEX } from '../shared/uuid-regex.js';

export class ExtendGoalDeadline {
  constructor(
    private readonly repo: IGoalRepository,
    private readonly publisher: IGoalsEventPublisher,
  ) {}

  async execute(dto: ExtendGoalDeadlineInputDTO): Promise<DomainResult<void>> {
    if (!UUID_V4_REGEX.test(dto.goalId)) {
      return left(new GoalNotFoundError());
    }

    const goal = await this.repo.findById(dto.goalId);
    if (!goal) return left(new GoalNotFoundError());

    // Tenant isolation: only the owning professional may extend the deadline (ADR-0025).
    if (goal.professionalProfileId !== dto.extendedBy) {
      return left(new UnauthorizedProfessionalError());
    }

    // Validate new date.
    const newDateResult = TargetDate.fromString(dto.newTargetDate);
    if (newDateResult.isLeft()) return left(newDateResult.value);

    if (!newDateResult.value.isFuture()) {
      return left(new InvalidTargetDateError('New target date must be in the future.'));
    }

    // New deadline must be after current deadline.
    if (goal.targetDate && dto.newTargetDate <= goal.targetDate) {
      return left(
        new InvalidTargetDateError(
          `New deadline must be after current deadline (${goal.targetDate}).`,
        ),
      );
    }

    const outcomeResult = goal.extendDeadline(dto.newTargetDate, dto.reason);
    if (outcomeResult.isLeft()) return left(outcomeResult.value);
    const outcome = outcomeResult.value;

    await this.repo.save(goal);

    await this.publisher.publishGoalDeadlineExtended(
      new GoalDeadlineExtendedEvent(goal.id, goal.professionalProfileId, {
        clientId: goal.clientId,
        oldDeadline: outcome.oldDeadline,
        newDeadline: outcome.newDeadline,
        reason: outcome.reason,
        extendedBy: dto.extendedBy,
      }),
    );

    return right(undefined);
  }
}
