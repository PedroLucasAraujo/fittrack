import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { GoalNotFoundError } from '../../domain/errors/goal-not-found-error.js';
import type { Goal } from '../../domain/aggregates/goal.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';
import type { GetClientGoalsInputDTO, GoalDTO, MilestoneDTO } from '../dtos/index.js';
import { UUID_V4_REGEX } from '../shared/uuid-regex.js';

const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function deriveStatus(goal: Goal): 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED' {
  if (goal.isAbandoned()) return 'ABANDONED';
  if (goal.isCompleted()) return 'COMPLETED';
  if (goal.isActive()) return 'ACTIVE';
  return 'DRAFT';
}

function toDTO(goal: Goal): GoalDTO {
  const milestones: MilestoneDTO[] = goal.milestones.map((m) => ({
    milestoneId: m.id,
    name: m.name,
    targetValue: m.targetValue,
    unit: m.unit,
    order: m.order,
    isReached: m.isReached(),
    reachedAtUtc: m.reachedAtUtc?.value.toISOString() ?? null,
  }));

  return {
    goalId: goal.id,
    clientId: goal.clientId,
    professionalProfileId: goal.professionalProfileId,
    name: goal.name,
    description: goal.description,
    category: goal.category,
    metricType: goal.metricType,
    priority: goal.priority,
    reason: goal.reason,
    baselineValue: goal.baselineValue,
    targetValue: goal.targetValue,
    currentValue: goal.currentValue,
    unit: goal.unit,
    progressPercentage: goal.progressPercentage,
    targetDate: goal.targetDate,
    daysRemaining: goal.daysRemaining(),
    status: deriveStatus(goal),
    isAchieved: goal.isAchieved(),
    milestoneProgress: goal.getMilestoneProgress(),
    milestones,
    createdAtUtc: goal.createdAtUtc.value.toISOString(),
    approvedAtUtc: goal.approvedAtUtc?.value.toISOString() ?? null,
    startedAtUtc: goal.startedAtUtc?.value.toISOString() ?? null,
    completedAtUtc: goal.completedAtUtc?.value.toISOString() ?? null,
    abandonedAtUtc: goal.abandonedAtUtc?.value.toISOString() ?? null,
  };
}

export class GetClientGoals {
  constructor(private readonly repo: IGoalRepository) {}

  async execute(dto: GetClientGoalsInputDTO): Promise<DomainResult<GoalDTO[]>> {
    if (!UUID_V4_REGEX.test(dto.clientId)) {
      return left(new GoalNotFoundError());
    }

    const goals = await this.repo.findByClient(dto.clientId);

    // Filter by status.
    const status = dto.status ?? 'ALL';
    const filtered = status === 'ALL' ? goals : goals.filter((g) => deriveStatus(g) === status);

    // Sort: priority DESC (HIGH first), then createdAt DESC.
    filtered.sort((a, b) => {
      const pDiff = (PRIORITY_ORDER[a.priority] as number) - (PRIORITY_ORDER[b.priority] as number);
      if (pDiff !== 0) return pDiff;
      return b.createdAtUtc.value.getTime() - a.createdAtUtc.value.getTime();
    });

    return right(filtered.map(toDTO));
  }
}
