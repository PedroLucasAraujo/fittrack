import type { CalculateUserEngagementUseCase } from '../use-cases/CalculateUserEngagementUseCase.js';

/**
 * Handles SelfLogRecordedEvent from the Self-Log module (ADR-0009).
 *
 * Triggers an engagement recalculation to refresh the user's habit score
 * (nutrition log consistency) without waiting for the daily batch job.
 */
export class OnSelfLogRecorded {
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
      console.error('[OnSelfLogRecorded] Engagement recalculation failed', {
        error: result.value.message,
      });
    }
  }
}
