import type { DetectProfessionalRisk } from '../use-cases/detect-professional-risk.js';
import type { SessionFeedbackSubmittedPayload } from '../../domain/events/session-feedback-submitted-event.js';

/**
 * Reacts to SessionFeedbackSubmitted events (ADR-0047, ADR-0057 §5).
 *
 * When a negative feedback (rating ≤ 2) is received, triggers risk detection
 * to evaluate whether the professional has crossed a threshold.
 *
 * Risk detection failures are non-fatal — logged but do not block feedback submission.
 */
export class OnSessionFeedbackSubmitted {
  constructor(private readonly detectProfessionalRisk: DetectProfessionalRisk) {}

  async handle(payload: SessionFeedbackSubmittedPayload): Promise<void> {
    // Only trigger risk detection for negative feedbacks
    if (!payload.isNegative) return;

    const result = await this.detectProfessionalRisk.execute({
      professionalProfileId: payload.professionalProfileId,
    });

    if (result.isLeft()) {
      // Risk detection is best-effort; failures must not surface to the client
      // eslint-disable-next-line no-console
      console.error('[OnSessionFeedbackSubmitted] Risk detection failed', {
        feedbackId: payload.feedbackId,
        professionalProfileId: payload.professionalProfileId,
        error: result.value.message,
      });
    }
  }
}
