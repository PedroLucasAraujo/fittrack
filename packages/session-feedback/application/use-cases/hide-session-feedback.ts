import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { FeedbackNotFoundError } from '../../domain/errors/feedback-not-found-error.js';
import { SessionFeedbackHiddenEvent } from '../../domain/events/session-feedback-hidden-event.js';
import type { ISessionFeedbackRepository } from '../../domain/repositories/i-session-feedback-repository.js';
import type { ISessionFeedbackEventPublisher } from '../ports/i-session-feedback-event-publisher.js';
import type {
  HideSessionFeedbackInputDTO,
  HideSessionFeedbackOutputDTO,
} from '../dtos/hide-session-feedback-dto.js';

/**
 * Hides (soft-deletes) a session feedback. Admin operation only (ADR-0057 §7).
 *
 * ## Side effects
 * - SessionFeedbackHiddenEvent published post-commit
 * - Consumers recalculate risk detection because hidden feedbacks
 *   do NOT count toward the negative feedback threshold (ADR-0057 §5)
 */
export class HideSessionFeedback {
  constructor(
    private readonly feedbackRepo: ISessionFeedbackRepository,
    private readonly eventPublisher: ISessionFeedbackEventPublisher,
  ) {}

  async execute(
    dto: HideSessionFeedbackInputDTO,
  ): Promise<DomainResult<HideSessionFeedbackOutputDTO>> {
    // 1. Load aggregate
    const feedback = await this.feedbackRepo.findById(dto.feedbackId);
    if (feedback === null) {
      return left(new FeedbackNotFoundError(dto.feedbackId));
    }

    // 2. Capture whether it was negative before hiding (for event payload)
    const wasNegative = feedback.isNegative();

    // 3. Call domain method
    const hideResult = feedback.hide();
    if (hideResult.isLeft()) return left(hideResult.value);
    const hiddenAt = hideResult.value;

    // 4. Persist
    await this.feedbackRepo.save(feedback);

    // 5. Publish event post-commit (ADR-0009 §4)
    await this.eventPublisher.publishFeedbackHidden(
      new SessionFeedbackHiddenEvent(feedback.id, feedback.professionalProfileId, {
        feedbackId: feedback.id,
        professionalProfileId: feedback.professionalProfileId,
        wasNegative,
        hiddenAtUtc: hiddenAt.toISO(),
      }),
    );

    return right({
      feedbackId: feedback.id,
      hiddenAtUtc: hiddenAt.toISO(),
    });
  }
}
