import type { DetectProfessionalRisk } from '../use-cases/detect-professional-risk.js';
import type { SessionFeedbackHiddenPayload } from '../../domain/events/session-feedback-hidden-event.js';

/**
 * Reacts to SessionFeedbackHidden events (ADR-0047, ADR-0057 §5).
 *
 * When a negative feedback is hidden, recalculates risk detection because
 * hidden feedbacks do NOT count toward the threshold. This may cause a
 * professional to drop below the threshold and recover from WATCHLIST/FLAGGED.
 *
 * Risk recalculation failures are non-fatal — logged but do not block the hide.
 */
export class OnSessionFeedbackHidden {
  constructor(private readonly detectProfessionalRisk: DetectProfessionalRisk) {}

  async handle(payload: SessionFeedbackHiddenPayload): Promise<void> {
    // Only recalculate if the hidden feedback was negative
    if (!payload.wasNegative) return;

    const result = await this.detectProfessionalRisk.execute({
      professionalProfileId: payload.professionalProfileId,
    });

    if (result.isLeft()) {
      // eslint-disable-next-line no-console
      console.error('[OnSessionFeedbackHidden] Risk recalculation failed', {
        feedbackId: payload.feedbackId,
        professionalProfileId: payload.professionalProfileId,
        error: result.value.message,
      });
    }
  }
}
