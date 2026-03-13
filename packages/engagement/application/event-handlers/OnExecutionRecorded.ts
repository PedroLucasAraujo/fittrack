import type { CalculateUserEngagementUseCase } from '../use-cases/CalculateUserEngagementUseCase.js';

/**
 * Handles ExecutionRecordedEvent from the Execution module (ADR-0009).
 *
 * Triggers an immediate engagement recalculation so that the user's
 * workout score reflects the latest execution without waiting for the
 * daily batch job.
 *
 * The event payload uses `clientId` as the user identifier in the
 * Execution context. `professionalProfileId` is the tenant key.
 */
export class OnExecutionRecorded {
  constructor(
    private readonly calculateEngagement: CalculateUserEngagementUseCase,
  ) {}

  async handle(payload: {
    clientId: string;
    professionalProfileId: string;
  }): Promise<void> {
    const result = await this.calculateEngagement.execute({
      userId: payload.clientId,
      professionalProfileId: payload.professionalProfileId,
    });

    if (result.isLeft()) {
      // Non-fatal: daily job will recalculate. Log but do not throw.
      console.error('[OnExecutionRecorded] Engagement recalculation failed', {
        error: result.value.message,
      });
    }
  }
}
