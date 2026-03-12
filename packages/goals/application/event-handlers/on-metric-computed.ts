import type { UpdateGoalProgress } from '../use-cases/update-goal-progress.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';
import type { GoalMetricValue } from '../../domain/value-objects/goal-metric.js';

/**
 * Payload of the MetricComputedEvent emitted by the Metrics context.
 * Goals consumes this to update progress for WEEKLY_VOLUME goals.
 */
export interface MetricComputedForGoalsPayload {
  readonly clientId: string;
  /** Matches a GoalMetricValue, e.g. 'WEEKLY_VOLUME'. */
  readonly metricType: string;
  readonly value: number;
}

/**
 * Event handler: subscribes to `MetricComputed` from the Metrics context.
 * Updates active goals whose metricType matches the computed metric (ADR-0068 §5).
 */
export class OnMetricComputed {
  constructor(
    private readonly goalRepo: IGoalRepository,
    private readonly updateGoalProgress: UpdateGoalProgress,
  ) {}

  async handle(payload: MetricComputedForGoalsPayload): Promise<void> {
    const goals = await this.goalRepo.findActiveGoalsByMetric(
      payload.clientId,
      payload.metricType as GoalMetricValue,
    );

    for (const goal of goals) {
      const result = await this.updateGoalProgress.execute({
        goalId: goal.id,
        newValue: payload.value,
        source: 'METRIC',
      });
      if (result.isLeft()) {
        // eslint-disable-next-line no-console
        console.error(`[OnMetricComputed] Failed to update goal progress: ${result.value.code}`);
      }
    }
  }
}
