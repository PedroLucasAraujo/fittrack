import { UTCDateTime, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { SessionFeedback } from '../../domain/aggregates/session-feedback.js';
import { SessionRating } from '../../domain/value-objects/session-rating.js';
import { FeedbackComment } from '../../domain/value-objects/feedback-comment.js';
import { FeedbackWindowClosedError } from '../../domain/errors/feedback-window-closed-error.js';
import { FeedbackAlreadyExistsError } from '../../domain/errors/feedback-already-exists-error.js';
import { BookingNotCompletedError } from '../../domain/errors/booking-not-completed-error.js';
import { InvalidFeedbackError } from '../../domain/errors/invalid-feedback-error.js';
import { SessionFeedbackSubmittedEvent } from '../../domain/events/session-feedback-submitted-event.js';
import type { ISessionFeedbackRepository } from '../../domain/repositories/i-session-feedback-repository.js';
import type { ISessionFeedbackEventPublisher } from '../ports/i-session-feedback-event-publisher.js';
import type {
  SubmitSessionFeedbackInputDTO,
  SubmitSessionFeedbackOutputDTO,
} from '../dtos/submit-session-feedback-dto.js';

const FEEDBACK_WINDOW_HOURS = 48;

/**
 * Submits a client's feedback for a completed session (ADR-0057 §3).
 *
 * ## Pre-conditions enforced here
 * 1. booking must be COMPLETED (communicated via DTO field `completedAtUtc`)
 * 2. Feedback window (48h) must not have expired
 * 3. No feedback must already exist for this booking (1:1)
 *
 * Note: client identity is validated by the booking context before calling this use case.
 *
 * ## Post-conditions
 * - SessionFeedbackSubmittedEvent published post-commit (ADR-0047 §4)
 */
export class SubmitSessionFeedback {
  constructor(
    private readonly feedbackRepo: ISessionFeedbackRepository,
    private readonly eventPublisher: ISessionFeedbackEventPublisher,
  ) {}

  async execute(
    dto: SubmitSessionFeedbackInputDTO,
  ): Promise<DomainResult<SubmitSessionFeedbackOutputDTO>> {
    // 1. Validate required IDs
    if (!dto.bookingId || dto.bookingId.trim().length === 0) {
      return left(new InvalidFeedbackError('bookingId is required'));
    }
    if (!dto.clientId || dto.clientId.trim().length === 0) {
      return left(new InvalidFeedbackError('clientId is required'));
    }
    if (!dto.professionalProfileId || dto.professionalProfileId.trim().length === 0) {
      return left(new InvalidFeedbackError('professionalProfileId is required'));
    }

    // 2. Validate completedAtUtc is present (signals booking is COMPLETED)
    if (!dto.completedAtUtc) {
      return left(new BookingNotCompletedError(dto.bookingId));
    }

    // 3. Validate feedback window (48h)
    let completedAt: Date;
    try {
      completedAt = new Date(dto.completedAtUtc);
      if (isNaN(completedAt.getTime())) throw new Error();
    } catch {
      return left(new InvalidFeedbackError('completedAtUtc is not a valid ISO date string'));
    }

    const windowMs = FEEDBACK_WINDOW_HOURS * 60 * 60 * 1000;
    const now = new Date();
    if (now.getTime() - completedAt.getTime() > windowMs) {
      return left(new FeedbackWindowClosedError(dto.bookingId));
    }

    // 4. Check for duplicate
    const alreadyExists = await this.feedbackRepo.existsByBookingId(dto.bookingId);
    if (alreadyExists) {
      return left(new FeedbackAlreadyExistsError(dto.bookingId));
    }

    // 5. Create SessionRating VO
    const ratingResult = SessionRating.create(dto.rating);
    if (ratingResult.isLeft()) return left(ratingResult.value);
    const rating = ratingResult.value;

    // 6. Create optional FeedbackComment VO
    let comment: FeedbackComment | null = null;
    if (dto.comment !== undefined && dto.comment.trim().length > 0) {
      const commentResult = FeedbackComment.create(dto.comment);
      if (commentResult.isLeft()) return left(commentResult.value);
      comment = commentResult.value;
    }

    // 7. Validate sessionDate
    if (!dto.sessionDate || dto.sessionDate.trim().length === 0) {
      return left(new InvalidFeedbackError('sessionDate is required'));
    }

    // 8. Create aggregate
    const feedbackResult = SessionFeedback.create({
      professionalProfileId: dto.professionalProfileId,
      clientId: dto.clientId,
      bookingId: dto.bookingId,
      rating,
      comment,
      sessionDate: dto.sessionDate,
      submittedAtUtc: UTCDateTime.now(),
    });
    /* v8 ignore next */
    if (feedbackResult.isLeft()) return left(feedbackResult.value);
    const feedback = feedbackResult.value;

    // 9. Persist
    await this.feedbackRepo.save(feedback);

    // 10. Publish event post-commit (ADR-0047 §4)
    await this.eventPublisher.publishFeedbackSubmitted(
      new SessionFeedbackSubmittedEvent(feedback.id, feedback.professionalProfileId, {
        feedbackId: feedback.id,
        bookingId: feedback.bookingId,
        clientId: feedback.clientId,
        professionalProfileId: feedback.professionalProfileId,
        rating: feedback.rating.toNumber(),
        isNegative: feedback.isNegative(),
        sessionDate: feedback.sessionDate,
        submittedAtUtc: feedback.submittedAtUtc.toISO(),
      }),
    );

    return right({
      feedbackId: feedback.id,
      professionalProfileId: feedback.professionalProfileId,
      bookingId: feedback.bookingId,
      rating: feedback.rating.toNumber(),
      submittedAtUtc: feedback.submittedAtUtc.toISO(),
    });
  }
}
