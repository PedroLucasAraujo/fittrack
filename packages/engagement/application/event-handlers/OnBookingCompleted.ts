import type { CalculateUserEngagementUseCase } from '../use-cases/CalculateUserEngagementUseCase.js';

/**
 * Handles BookingCompleted event from the Scheduling module (ADR-0009).
 *
 * Triggers an engagement recalculation to refresh the user's
 * bookings-attended count without waiting for the daily batch job.
 */
export class OnBookingCompleted {
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
      console.error('[OnBookingCompleted] Engagement recalculation failed', {
        error: result.value.message,
      });
    }
  }
}
