import type { UpdateGoalProgress } from '../use-cases/update-goal-progress.js';
import type { IGoalRepository } from '../../domain/repositories/i-goal-repository.js';

/**
 * Payload of the AssessmentCompletedEvent emitted by the Assessments context.
 * Goals consumes this to update progress for WEIGHT and BODY_FAT goals.
 */
export interface AssessmentCompletedForGoalsPayload {
  readonly clientId: string;
  readonly weightKg: number | null;
  readonly bodyFatPercentage: number | null;
}

/**
 * Event handler: subscribes to `AssessmentCompleted` from the Assessments context.
 * Updates all active WEIGHT and BODY_FAT goals for the client (ADR-0068 §5).
 */
export class OnAssessmentCompleted {
  constructor(
    private readonly goalRepo: IGoalRepository,
    private readonly updateGoalProgress: UpdateGoalProgress,
  ) {}

  async handle(payload: AssessmentCompletedForGoalsPayload): Promise<void> {
    const metricMap: Array<{ metric: 'WEIGHT' | 'BODY_FAT'; value: number | null }> = [
      { metric: 'WEIGHT', value: payload.weightKg },
      { metric: 'BODY_FAT', value: payload.bodyFatPercentage },
    ];

    for (const { metric, value } of metricMap) {
      if (value === null) continue;

      const goals = await this.goalRepo.findActiveGoalsByMetric(payload.clientId, metric);
      for (const goal of goals) {
        const result = await this.updateGoalProgress.execute({
          goalId: goal.id,
          newValue: value,
          source: 'ASSESSMENT',
        });
        // Log but do not throw — event processing must remain resilient (ADR-0016).
        if (result.isLeft()) {
          // No PII in logs (ADR-0037).
          // eslint-disable-next-line no-console
          console.error(
            `[OnAssessmentCompleted] Failed to update goal progress: ${result.value.code}`,
          );
        }
      }
    }
  }
}
