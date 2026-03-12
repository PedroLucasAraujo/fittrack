import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Goal } from '../../domain/aggregates/goal.js';
import { GoalCategory } from '../../domain/value-objects/goal-category.js';
import { GoalMetric } from '../../domain/value-objects/goal-metric.js';
import { GoalName } from '../../domain/value-objects/goal-name.js';
import { GoalPriority } from '../../domain/value-objects/goal-priority.js';
import { TargetDate } from '../../domain/value-objects/target-date.js';
import { Milestone } from '../../domain/entities/milestone.js';
import { ProgressEntry } from '../../domain/entities/progress-entry.js';
import { GoalCreatedEvent } from '../../domain/events/goal-created-event.js';
import { GoalApprovedEvent } from '../../domain/events/goal-approved-event.js';
import { GoalStartedEvent } from '../../domain/events/goal-started-event.js';
import { GoalRiskDetectedEvent } from '../../domain/events/goal-risk-detected-event.js';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found-error.js';
import { InvalidTargetDateError } from '../../domain/errors/invalid-target-date-error.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';
import type { IGoalsEventPublisher } from '../ports/i-goals-event-publisher.js';
import type { CreateGoalInputDTO, CreateGoalOutputDTO } from '../dtos/index.js';

import { UUID_V4_REGEX } from '../shared/uuid-regex.js';

/**
 * Aggressive weight-loss threshold: more than 1 kg/week is considered high risk.
 * 4 weeks / month × 1 kg = 4 kg/month max safe rate.
 */
const MAX_SAFE_WEIGHT_LOSS_PER_MONTH_KG = 4;

/**
 * Creates a new Goal.
 *
 * - When `createdBy === professionalProfileId`: goal is auto-approved and started.
 * - When `createdBy === clientId`: goal is left in DRAFT awaiting professional approval.
 *
 * Risk detection runs in both cases for informational purposes.
 */
export class CreateGoal {
  constructor(
    private readonly repo: IGoalRepository,
    private readonly publisher: IGoalsEventPublisher,
  ) {}

  async execute(dto: CreateGoalInputDTO): Promise<DomainResult<CreateGoalOutputDTO>> {
    // 1. Validate UUIDs.
    if (!UUID_V4_REGEX.test(dto.clientId)) {
      return left(new GoalNotFoundError());
    }
    if (!UUID_V4_REGEX.test(dto.professionalProfileId)) {
      return left(new GoalNotFoundError());
    }

    // 2. Validate value objects.
    const nameResult = GoalName.create(dto.name);
    if (nameResult.isLeft()) return left(nameResult.value);

    const categoryResult = GoalCategory.create(dto.category);
    if (categoryResult.isLeft()) return left(categoryResult.value);

    const metricResult = GoalMetric.create(dto.metricType);
    if (metricResult.isLeft()) return left(metricResult.value);

    const priorityResult = GoalPriority.create(dto.priority);
    if (priorityResult.isLeft()) return left(priorityResult.value);

    // 3. Validate targetDate if provided.
    let targetDateStr: string | null = null;
    if (dto.targetDate) {
      const tdResult = TargetDate.fromString(dto.targetDate);
      if (tdResult.isLeft()) return left(tdResult.value);
      if (!tdResult.value.isFuture()) {
        return left(new InvalidTargetDateError('Target date must be in the future.'));
      }
      targetDateStr = dto.targetDate;
    }

    // 4. Create Goal aggregate.
    const goalResult = Goal.create({
      clientId: dto.clientId,
      professionalProfileId: dto.professionalProfileId,
      name: nameResult.value.value,
      description: dto.description,
      category: categoryResult.value.value,
      reason: dto.reason ?? null,
      priority: priorityResult.value.value,
      metricType: metricResult.value.value,
      baselineValue: dto.baselineValue,
      targetValue: dto.targetValue,
      unit: dto.unit,
      targetDate: targetDateStr,
    });
    if (goalResult.isLeft()) return left(goalResult.value);
    const goal = goalResult.value;

    // 5. Add milestones if provided.
    if (dto.milestones && dto.milestones.length > 0) {
      for (let i = 0; i < dto.milestones.length; i++) {
        const mSpec = dto.milestones[i];
        if (!mSpec) continue;
        const msResult = Milestone.create({
          name: mSpec.name,
          targetValue: mSpec.targetValue,
          unit: dto.unit,
          order: i + 1,
        });
        if (msResult.isLeft()) return left(msResult.value);
        const addResult = goal.addMilestone(msResult.value);
        if (addResult.isLeft()) return left(addResult.value);
      }
    }

    // 6. Risk detection (aggressive goal check).
    let riskDetected = false;
    const riskResult = this._assessRisk(goal, dto);
    if (riskResult !== null) {
      riskDetected = true;
    }

    // 7. Auto-approve if created by the professional.
    const createdByProfessional = dto.createdBy === dto.professionalProfileId;
    if (createdByProfessional) {
      const approveResult = goal.approve();
      /* c8 ignore next */
      if (approveResult.isLeft()) return left(approveResult.value);

      // Add baseline as first progress entry.
      const entryResult = ProgressEntry.create({
        value: dto.baselineValue,
        unit: dto.unit,
        source: 'MANUAL',
        recordedBy: dto.professionalProfileId,
        notes: 'Initial baseline value',
      });
      /* c8 ignore next */
      if (entryResult.isLeft()) return left(entryResult.value);

      const startResult = goal.start();
      /* c8 ignore next */
      if (startResult.isLeft()) return left(startResult.value);
    }

    // 8. Persist.
    await this.repo.save(goal);

    // 9. Publish events post-commit (ADR-0009 §4).
    await this.publisher.publishGoalCreated(
      new GoalCreatedEvent(goal.id, dto.professionalProfileId, {
        clientId: goal.clientId,
        professionalProfileId: goal.professionalProfileId,
        createdBy: dto.createdBy,
        category: goal.category,
        metricType: goal.metricType,
        baselineValue: goal.baselineValue,
        targetValue: goal.targetValue,
        unit: goal.unit,
        targetDate: goal.targetDate,
        priority: goal.priority,
      }),
    );

    if (riskResult !== null) {
      await this.publisher.publishGoalRiskDetected(
        new GoalRiskDetectedEvent(goal.id, dto.professionalProfileId, riskResult),
      );
    }

    if (createdByProfessional) {
      await this.publisher.publishGoalApproved(
        new GoalApprovedEvent(goal.id, dto.professionalProfileId, {
          clientId: goal.clientId,
          professionalProfileId: goal.professionalProfileId,
        }),
      );
      await this.publisher.publishGoalStarted(
        new GoalStartedEvent(goal.id, dto.professionalProfileId, {
          clientId: goal.clientId,
          baselineValue: goal.baselineValue,
          targetValue: goal.targetValue,
          unit: goal.unit,
        }),
      );
    }

    return right({ goalId: goal.id, autoApproved: createdByProfessional, riskDetected });
  }

  private _assessRisk(
    goal: Goal,
    dto: CreateGoalInputDTO,
  ): {
    clientId: string;
    professionalProfileId: string;
    riskLevel: 'HIGH' | 'VERY_HIGH';
    reason: string;
  } | null {
    if (goal.metricType !== 'WEIGHT') return null;

    const totalLoss = goal.baselineValue - goal.targetValue;
    if (totalLoss <= 0) return null; // not a weight loss goal

    if (!dto.targetDate) {
      // No time limit — only flag if delta is extreme (>30kg)
      if (totalLoss > 30) {
        return {
          clientId: goal.clientId,
          professionalProfileId: goal.professionalProfileId,
          riskLevel: 'HIGH',
          reason: `Weight loss goal of ${totalLoss} kg with no target date is aggressive.`,
        };
      }
      return null;
    }

    const targetDate = TargetDate.fromString(dto.targetDate);
    /* c8 ignore next */
    if (targetDate.isLeft()) return null;

    const daysUntilTarget = (targetDate.value as TargetDate).daysFromNow();
    const monthsUntilTarget = daysUntilTarget / 30;
    /* c8 ignore next */
    if (monthsUntilTarget <= 0) return null;

    const kgPerMonth = totalLoss / monthsUntilTarget;

    if (kgPerMonth > MAX_SAFE_WEIGHT_LOSS_PER_MONTH_KG * 2) {
      return {
        clientId: goal.clientId,
        professionalProfileId: goal.professionalProfileId,
        riskLevel: 'VERY_HIGH',
        reason: `Weight loss of ~${kgPerMonth.toFixed(1)} kg/month exceeds safe limits.`,
      };
    }
    if (kgPerMonth > MAX_SAFE_WEIGHT_LOSS_PER_MONTH_KG) {
      return {
        clientId: goal.clientId,
        professionalProfileId: goal.professionalProfileId,
        riskLevel: 'HIGH',
        reason: `Weight loss of ~${kgPerMonth.toFixed(1)} kg/month is above recommended pace.`,
      };
    }
    return null;
  }
}
