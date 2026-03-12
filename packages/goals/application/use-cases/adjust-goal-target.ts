import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found-error.js';
import { UnauthorizedProfessionalError } from '../../domain/errors/unauthorized-professional-error.js';
import { GoalTargetAdjustedEvent } from '../../domain/events/goal-target-adjusted-event.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';
import type { IGoalsEventPublisher } from '../ports/i-goals-event-publisher.js';
import type { AdjustGoalTargetInputDTO } from '../dtos/index.js';
import { UUID_V4_REGEX } from '../shared/uuid-regex.js';

export class AdjustGoalTarget {
  constructor(
    private readonly repo: IGoalRepository,
    private readonly publisher: IGoalsEventPublisher,
  ) {}

  async execute(dto: AdjustGoalTargetInputDTO): Promise<DomainResult<void>> {
    if (!UUID_V4_REGEX.test(dto.goalId)) {
      return left(new GoalNotFoundError());
    }

    const goal = await this.repo.findById(dto.goalId);
    if (!goal) return left(new GoalNotFoundError());

    if (goal.professionalProfileId !== dto.adjustedBy) {
      return left(new UnauthorizedProfessionalError());
    }

    const outcomeResult = goal.adjustTarget(dto.newTargetValue, dto.reason);
    if (outcomeResult.isLeft()) return left(outcomeResult.value);
    const outcome = outcomeResult.value;

    await this.repo.save(goal);

    await this.publisher.publishGoalTargetAdjusted(
      new GoalTargetAdjustedEvent(goal.id, goal.professionalProfileId, {
        clientId: goal.clientId,
        oldTarget: outcome.oldTarget,
        newTarget: outcome.newTarget,
        reason: outcome.reason,
        adjustedBy: dto.adjustedBy,
      }),
    );

    return right(undefined);
  }
}
