import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { FeedbackFlagReason } from '../../domain/value-objects/feedback-flag-reason.js';
import { FeedbackNotFoundError } from '../../domain/errors/feedback-not-found-error.js';
import { UnauthorizedFeedbackActionError } from '../../domain/errors/unauthorized-feedback-action-error.js';
import { SessionFeedbackFlaggedEvent } from '../../domain/events/session-feedback-flagged-event.js';
import type { ISessionFeedbackRepository } from '../../domain/repositories/i-session-feedback-repository.js';
import type { ISessionFeedbackEventPublisher } from '../ports/i-session-feedback-event-publisher.js';
import type {
  FlagSessionFeedbackInputDTO,
  FlagSessionFeedbackOutputDTO,
} from '../dtos/flag-session-feedback-dto.js';

/**
 * Flags a session feedback for moderation review (ADR-0057 §8).
 *
 * ## Authorization
 * - professional: may only flag feedbacks where professionalProfileId matches flaggedBy
 * - admin: may flag any feedback
 * - client: cannot flag feedbacks
 */
export class FlagSessionFeedback {
  constructor(
    private readonly feedbackRepo: ISessionFeedbackRepository,
    private readonly eventPublisher: ISessionFeedbackEventPublisher,
  ) {}

  async execute(
    dto: FlagSessionFeedbackInputDTO,
  ): Promise<DomainResult<FlagSessionFeedbackOutputDTO>> {
    // 1. Load aggregate
    const feedback = await this.feedbackRepo.findById(dto.feedbackId);
    if (feedback === null) {
      return left(new FeedbackNotFoundError(dto.feedbackId));
    }

    // 2. Authorization check
    if (dto.flaggedByRole === 'professional') {
      if (feedback.professionalProfileId !== dto.flaggedBy) {
        return left(
          new UnauthorizedFeedbackActionError(
            'professionals can only flag feedbacks directed at themselves',
          ),
        );
      }
    }
    // admin role has no additional restrictions

    // 3. Create FeedbackFlagReason VO
    const reasonResult = FeedbackFlagReason.create(dto.reason);
    if (reasonResult.isLeft()) return left(reasonResult.value);
    const reason = reasonResult.value;

    // 4. Call domain method
    const flagResult = feedback.flag(reason);
    if (flagResult.isLeft()) return left(flagResult.value);
    const flaggedAt = flagResult.value;

    // 5. Persist
    await this.feedbackRepo.save(feedback);

    // 6. Publish event post-commit (ADR-0009 §4)
    await this.eventPublisher.publishFeedbackFlagged(
      new SessionFeedbackFlaggedEvent(feedback.id, feedback.professionalProfileId, {
        feedbackId: feedback.id,
        bookingId: feedback.bookingId,
        professionalProfileId: feedback.professionalProfileId,
        flagReason: reason.value,
        flaggedAtUtc: flaggedAt.toISO(),
      }),
    );

    return right({
      feedbackId: feedback.id,
      flaggedAtUtc: flaggedAt.toISO(),
    });
  }
}
