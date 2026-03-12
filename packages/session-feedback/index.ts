// ── Domain — Errors ───────────────────────────────────────────────────────────
export { SessionFeedbackErrorCodes } from './domain/errors/session-feedback-error-codes.js';
export type { SessionFeedbackErrorCode } from './domain/errors/session-feedback-error-codes.js';
export { InvalidFeedbackError } from './domain/errors/invalid-feedback-error.js';
export { FeedbackNotFoundError } from './domain/errors/feedback-not-found-error.js';
export { InvalidSessionRatingError } from './domain/errors/invalid-session-rating-error.js';
export { InvalidFeedbackCommentError } from './domain/errors/invalid-feedback-comment-error.js';
export { FeedbackWindowClosedError } from './domain/errors/feedback-window-closed-error.js';
export { FeedbackAlreadyExistsError } from './domain/errors/feedback-already-exists-error.js';
export { FeedbackAlreadyFlaggedError } from './domain/errors/feedback-already-flagged-error.js';
export { FeedbackAlreadyHiddenError } from './domain/errors/feedback-already-hidden-error.js';
export { NotBookingClientError } from './domain/errors/not-booking-client-error.js';
export { BookingNotCompletedError } from './domain/errors/booking-not-completed-error.js';
export { UnauthorizedFeedbackActionError } from './domain/errors/unauthorized-feedback-action-error.js';

// ── Domain — Value Objects ────────────────────────────────────────────────────
export { SessionRating } from './domain/value-objects/session-rating.js';
export { FeedbackComment } from './domain/value-objects/feedback-comment.js';
export { FeedbackFlagReason } from './domain/value-objects/feedback-flag-reason.js';

// ── Domain — Events ───────────────────────────────────────────────────────────
export { SessionFeedbackSubmittedEvent } from './domain/events/session-feedback-submitted-event.js';
export type { SessionFeedbackSubmittedPayload } from './domain/events/session-feedback-submitted-event.js';
export { SessionFeedbackFlaggedEvent } from './domain/events/session-feedback-flagged-event.js';
export type { SessionFeedbackFlaggedPayload } from './domain/events/session-feedback-flagged-event.js';
export { SessionFeedbackHiddenEvent } from './domain/events/session-feedback-hidden-event.js';
export type { SessionFeedbackHiddenPayload } from './domain/events/session-feedback-hidden-event.js';
export { ProfessionalRiskDetectedEvent } from './domain/events/professional-risk-detected-event.js';
export type {
  ProfessionalRiskDetectedPayload,
  FeedbackRiskType,
} from './domain/events/professional-risk-detected-event.js';
export { ProfessionalRiskResolvedEvent } from './domain/events/professional-risk-resolved-event.js';
export type { ProfessionalRiskResolvedPayload } from './domain/events/professional-risk-resolved-event.js';

// ── Domain — Aggregates ───────────────────────────────────────────────────────
export { SessionFeedback } from './domain/aggregates/session-feedback.js';
export type { SessionFeedbackProps } from './domain/aggregates/session-feedback.js';

// ── Domain — Repositories ─────────────────────────────────────────────────────
export type { ISessionFeedbackRepository } from './domain/repositories/i-session-feedback-repository.js';

// ── Application — Ports ───────────────────────────────────────────────────────
export type { ISessionFeedbackEventPublisher } from './application/ports/i-session-feedback-event-publisher.js';

// ── Application — DTOs ────────────────────────────────────────────────────────
export type {
  SubmitSessionFeedbackInputDTO,
  SubmitSessionFeedbackOutputDTO,
} from './application/dtos/submit-session-feedback-dto.js';
export type {
  FlagSessionFeedbackInputDTO,
  FlagSessionFeedbackOutputDTO,
} from './application/dtos/flag-session-feedback-dto.js';
export type {
  HideSessionFeedbackInputDTO,
  HideSessionFeedbackOutputDTO,
} from './application/dtos/hide-session-feedback-dto.js';
export type {
  GetProfessionalFeedbacksInputDTO,
  GetProfessionalFeedbacksOutputDTO,
  SessionFeedbackItemDTO,
} from './application/dtos/get-professional-feedbacks-dto.js';
export type {
  GetProfessionalAverageRatingInputDTO,
  GetProfessionalAverageRatingOutputDTO,
} from './application/dtos/get-professional-average-rating-dto.js';
export type {
  DetectProfessionalRiskInputDTO,
  DetectProfessionalRiskOutputDTO,
} from './application/dtos/detect-professional-risk-dto.js';

// ── Application — Use Cases ───────────────────────────────────────────────────
export { SubmitSessionFeedback } from './application/use-cases/submit-session-feedback.js';
export { FlagSessionFeedback } from './application/use-cases/flag-session-feedback.js';
export { HideSessionFeedback } from './application/use-cases/hide-session-feedback.js';
export { DetectProfessionalRisk } from './application/use-cases/detect-professional-risk.js';
export { GetProfessionalFeedbacks } from './application/use-cases/get-professional-feedbacks.js';
export { GetProfessionalAverageRating } from './application/use-cases/get-professional-average-rating.js';

// ── Application — Event Handlers ──────────────────────────────────────────────
export { OnSessionFeedbackSubmitted } from './application/event-handlers/on-session-feedback-submitted.js';
export { OnSessionFeedbackHidden } from './application/event-handlers/on-session-feedback-hidden.js';
