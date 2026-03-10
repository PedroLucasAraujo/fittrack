import { UpdateChallengeProgressUseCase } from '../use-cases/update-challenge-progress-use-case.js';

/**
 * Handles MetricComputed events (e.g. total volume calculated, nutrition log counted)
 * and fans out progress updates to all active challenges that track that metric.
 *
 * ## Idempotency
 *
 * This handler passes the metric value as an absolute figure (already computed
 * by the Metrics bounded context). Because UpdateChallengeProgressUseCase rejects
 * decreases, delivering the same event twice results in a no-op after the first delivery.
 */
export interface MetricComputedEventPayload {
  userId: string;
  metricType: string;
  value: number;
}

export class OnMetricComputed {
  constructor(private readonly updateProgress: UpdateChallengeProgressUseCase) {}

  async handle(event: MetricComputedEventPayload): Promise<void> {
    await this.updateProgress.executeFanOut(event.userId, event.metricType, event.value);
  }
}
