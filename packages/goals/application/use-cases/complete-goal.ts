import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found-error.js';
import { UnauthorizedProfessionalError } from '../../domain/errors/unauthorized-professional-error.js';
import { GoalAchievedEvent } from '../../domain/events/goal-achieved-event.js';
import { GoalNotAchievedEvent } from '../../domain/events/goal-not-achieved-event.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';
import type { IGoalsEventPublisher } from '../ports/i-goals-event-publisher.js';
import type { CompleteGoalInputDTO } from '../dtos/index.js';
import { UUID_V4_REGEX } from '../shared/uuid-regex.js';

export class CompleteGoal {
  constructor(
    private readonly repo: IGoalRepository,
    private readonly publisher: IGoalsEventPublisher,
  ) {}

  async execute(dto: CompleteGoalInputDTO): Promise<DomainResult<void>> {
    if (!UUID_V4_REGEX.test(dto.goalId)) {
      return left(new GoalNotFoundError());
    }

    const goal = await this.repo.findById(dto.goalId);
    if (!goal) return left(new GoalNotFoundError());

    if (goal.professionalProfileId !== dto.completedBy) {
      return left(new UnauthorizedProfessionalError());
    }

    const outcomeResult = goal.complete(dto.achieved);
    if (outcomeResult.isLeft()) return left(outcomeResult.value);
    const outcome = outcomeResult.value;

    await this.repo.save(goal);

    if (outcome.type === 'completed_achieved') {
      await this.publisher.publishGoalAchieved(
        new GoalAchievedEvent(goal.id, goal.professionalProfileId, {
          clientId: goal.clientId,
          finalValue: outcome.finalValue,
          targetValue: outcome.targetValue,
          durationDays: outcome.durationDays,
        }),
      );
    } else {
      await this.publisher.publishGoalNotAchieved(
        new GoalNotAchievedEvent(goal.id, goal.professionalProfileId, {
          clientId: goal.clientId,
          finalValue: outcome.finalValue,
          targetValue: outcome.targetValue,
          gap: outcome.gap,
        }),
      );
    }

    return right(undefined);
  }
}
