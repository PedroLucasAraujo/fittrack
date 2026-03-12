import { generateId, UTCDateTime } from '@fittrack/core';
import { Goal } from '../../domain/aggregates/goal.js';
import type { GoalCategoryValue } from '../../domain/value-objects/goal-category.js';
import type { GoalMetricValue } from '../../domain/value-objects/goal-metric.js';
import type { GoalPriorityValue } from '../../domain/value-objects/goal-priority.js';

interface MakeGoalParams {
  id?: string;
  clientId?: string;
  professionalProfileId?: string;
  name?: string;
  description?: string;
  category?: GoalCategoryValue;
  metricType?: GoalMetricValue;
  baselineValue?: number;
  targetValue?: number;
  unit?: string;
  priority?: GoalPriorityValue;
  reason?: string | null;
  targetDate?: string | null;
  approved?: boolean;
  started?: boolean;
}

/**
 * Test helper that creates a valid Goal in the desired state.
 * Approved + started by default so tests can call recordProgress immediately.
 */
export function makeGoal(params: MakeGoalParams = {}): Goal {
  const result = Goal.create({
    id: params.id ?? generateId(),
    clientId: params.clientId ?? generateId(),
    professionalProfileId: params.professionalProfileId ?? generateId(),
    name: params.name ?? 'Test Goal',
    description: params.description ?? 'A test goal',
    category: params.category ?? 'WEIGHT_LOSS',
    metricType: params.metricType ?? 'WEIGHT',
    baselineValue: params.baselineValue ?? 85,
    targetValue: params.targetValue ?? 75,
    unit: params.unit ?? 'kg',
    priority: params.priority ?? 'MEDIUM',
    reason: params.reason ?? null,
    targetDate: params.targetDate ?? null,
    createdAtUtc: UTCDateTime.now(),
  });

  if (result.isLeft()) {
    throw new Error(`makeGoal failed: ${result.value.message}`);
  }

  const goal = result.value;

  const shouldApprove = params.approved !== false;
  const shouldStart = params.started !== false;

  if (shouldApprove) {
    goal.approve();
  }
  if (shouldApprove && shouldStart) {
    goal.start();
  }

  return goal;
}
