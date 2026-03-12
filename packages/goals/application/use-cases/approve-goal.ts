import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found-error.js';
import { UnauthorizedProfessionalError } from '../../domain/errors/unauthorized-professional-error.js';
import { GoalApprovedEvent } from '../../domain/events/goal-approved-event.js';
import { GoalStartedEvent } from '../../domain/events/goal-started-event.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';
import type { IGoalsEventPublisher } from '../ports/i-goals-event-publisher.js';
import type { ApproveGoalInputDTO } from '../dtos/index.js';
import { UUID_V4_REGEX } from '../shared/uuid-regex.js';

export class ApproveGoal {
  constructor(
    private readonly repo: IGoalRepository,
    private readonly publisher: IGoalsEventPublisher,
  ) {}

  async execute(dto: ApproveGoalInputDTO): Promise<DomainResult<void>> {
    if (!UUID_V4_REGEX.test(dto.goalId) || !UUID_V4_REGEX.test(dto.professionalProfileId)) {
      return left(new GoalNotFoundError());
    }

    const goal = await this.repo.findById(dto.goalId);
    if (!goal) return left(new GoalNotFoundError());

    // Tenant isolation: professional must own this goal (ADR-0025).
    if (goal.professionalProfileId !== dto.professionalProfileId) {
      return left(new UnauthorizedProfessionalError());
    }

    const approveResult = goal.approve();
    if (approveResult.isLeft()) return left(approveResult.value);

    const startResult = goal.start();
    /* c8 ignore next */
    if (startResult.isLeft()) return left(startResult.value);

    await this.repo.save(goal);

    await this.publisher.publishGoalApproved(
      new GoalApprovedEvent(goal.id, goal.professionalProfileId, {
        clientId: goal.clientId,
        professionalProfileId: goal.professionalProfileId,
      }),
    );

    await this.publisher.publishGoalStarted(
      new GoalStartedEvent(goal.id, goal.professionalProfileId, {
        clientId: goal.clientId,
        baselineValue: goal.baselineValue,
        targetValue: goal.targetValue,
        unit: goal.unit,
      }),
    );

    return right(undefined);
  }
}
