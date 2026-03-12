import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found-error.js';
import { UnauthorizedProfessionalError } from '../../domain/errors/unauthorized-professional-error.js';
import { Milestone } from '../../domain/entities/milestone.js';
import { GoalMilestoneAddedEvent } from '../../domain/events/goal-milestone-added-event.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';
import type { IGoalsEventPublisher } from '../ports/i-goals-event-publisher.js';
import type { AddMilestoneInputDTO, AddMilestoneOutputDTO } from '../dtos/index.js';
import { UUID_V4_REGEX } from '../shared/uuid-regex.js';

export class AddMilestone {
  constructor(
    private readonly repo: IGoalRepository,
    private readonly publisher: IGoalsEventPublisher,
  ) {}

  async execute(dto: AddMilestoneInputDTO): Promise<DomainResult<AddMilestoneOutputDTO>> {
    if (!UUID_V4_REGEX.test(dto.goalId)) {
      return left(new GoalNotFoundError());
    }

    const goal = await this.repo.findById(dto.goalId);
    if (!goal) return left(new GoalNotFoundError());

    // Tenant isolation: only the owning professional may add milestones (ADR-0025).
    if (goal.professionalProfileId !== dto.addedBy) {
      return left(new UnauthorizedProfessionalError());
    }

    const nextOrder = goal.milestones.length + 1;
    const msResult = Milestone.create({
      name: dto.milestoneName,
      targetValue: dto.milestoneTargetValue,
      unit: goal.unit,
      order: nextOrder,
    });
    if (msResult.isLeft()) return left(msResult.value);

    const addResult = goal.addMilestone(msResult.value);
    if (addResult.isLeft()) return left(addResult.value);

    await this.repo.save(goal);

    // Publish event post-save (ADR-0009 §4).
    await this.publisher.publishGoalMilestoneAdded(
      new GoalMilestoneAddedEvent(goal.id, goal.professionalProfileId, {
        clientId: goal.clientId,
        milestoneId: addResult.value.milestoneId,
        milestoneName: dto.milestoneName,
        milestoneTargetValue: dto.milestoneTargetValue,
        addedBy: dto.addedBy,
      }),
    );

    return right({ milestoneId: addResult.value.milestoneId });
  }
}
