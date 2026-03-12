import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found-error.js';
import { UnauthorizedProfessionalError } from '../../domain/errors/unauthorized-professional-error.js';
import { GoalAbandonedEvent } from '../../domain/events/goal-abandoned-event.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';
import type { IGoalsEventPublisher } from '../ports/i-goals-event-publisher.js';
import type { AbandonGoalInputDTO } from '../dtos/index.js';
import { UUID_V4_REGEX } from '../shared/uuid-regex.js';

export class AbandonGoal {
  constructor(
    private readonly repo: IGoalRepository,
    private readonly publisher: IGoalsEventPublisher,
  ) {}

  async execute(dto: AbandonGoalInputDTO): Promise<DomainResult<void>> {
    if (!UUID_V4_REGEX.test(dto.goalId)) {
      return left(new GoalNotFoundError());
    }

    const goal = await this.repo.findById(dto.goalId);
    if (!goal) return left(new GoalNotFoundError());

    // Tenant isolation: only the owning client or professional may abandon (ADR-0025, ADR-0068 §3).
    if (dto.abandonedBy !== goal.clientId && dto.abandonedBy !== goal.professionalProfileId) {
      return left(new UnauthorizedProfessionalError());
    }

    const outcomeResult = goal.abandon(dto.reason);
    if (outcomeResult.isLeft()) return left(outcomeResult.value);
    const outcome = outcomeResult.value;

    await this.repo.save(goal);

    await this.publisher.publishGoalAbandoned(
      new GoalAbandonedEvent(goal.id, goal.professionalProfileId, {
        clientId: goal.clientId,
        reason: outcome.reason,
      }),
    );

    return right(undefined);
  }
}
