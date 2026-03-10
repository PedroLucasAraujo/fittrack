// ── Errors ─────────────────────────────────────────────────────────────────────
export { ReviewErrorCodes } from './domain/errors/review-error-codes.js';
export type { ReviewErrorCode } from './domain/errors/review-error-codes.js';
export { InvalidReviewError } from './domain/errors/invalid-review-error.js';
export { ReviewNotFoundError } from './domain/errors/review-not-found-error.js';
export { InvalidRatingError } from './domain/errors/invalid-rating-error.js';
export { InvalidCommentError } from './domain/errors/invalid-comment-error.js';
export { InsufficientSessionsError } from './domain/errors/insufficient-sessions-error.js';
export { DuplicateReviewError } from './domain/errors/duplicate-review-error.js';
export { ReviewAlreadyRespondedError } from './domain/errors/review-already-responded-error.js';
export { ReviewAlreadyFlaggedError } from './domain/errors/review-already-flagged-error.js';
export { UnauthorizedReviewActionError } from './domain/errors/unauthorized-review-action-error.js';

// ── Value Objects ───────────────────────────────────────────────────────────────
export { Rating } from './domain/value-objects/rating.js';
export { Ratings } from './domain/value-objects/ratings.js';
export type { RatingsProps } from './domain/value-objects/ratings.js';
export { OverallRating } from './domain/value-objects/overall-rating.js';
export { ReviewComment } from './domain/value-objects/review-comment.js';
export { ProfessionalResponse } from './domain/value-objects/professional-response.js';
export { SessionCount } from './domain/value-objects/session-count.js';
export { VerifiedInteraction } from './domain/value-objects/verified-interaction.js';
export { FlagReason } from './domain/value-objects/flag-reason.js';
export { ReputationScore } from './domain/value-objects/reputation-score.js';
export { RecommendationRate } from './domain/value-objects/recommendation-rate.js';

// ── Domain Events ──────────────────────────────────────────────────────────────
export { ProfessionalReviewSubmittedEvent } from './domain/events/professional-review-submitted-event.js';
export type { ProfessionalReviewSubmittedPayload } from './domain/events/professional-review-submitted-event.js';
export { ProfessionalReviewRespondedEvent } from './domain/events/professional-review-responded-event.js';
export type { ProfessionalReviewRespondedPayload } from './domain/events/professional-review-responded-event.js';
export { ProfessionalReviewFlaggedEvent } from './domain/events/professional-review-flagged-event.js';
export type { ProfessionalReviewFlaggedPayload } from './domain/events/professional-review-flagged-event.js';
export { ProfessionalReviewHiddenEvent } from './domain/events/professional-review-hidden-event.js';
export type { ProfessionalReviewHiddenPayload } from './domain/events/professional-review-hidden-event.js';

// ── Aggregates ─────────────────────────────────────────────────────────────────
export { ProfessionalReview } from './domain/aggregates/professional-review.js';
export type { ProfessionalReviewProps } from './domain/aggregates/professional-review.js';

// ── Repositories ───────────────────────────────────────────────────────────────
export type { IProfessionalReviewRepository } from './domain/repositories/i-professional-review-repository.js';

// ── Domain Services (Anti-Corruption Layer) ─────────────────────────────────────
export type { ISessionHistoryQuery } from './domain/services/i-session-history-query.js';

// ── Application Projections ─────────────────────────────────────────────────────
export { ProfessionalReputationScore } from './application/projections/professional-reputation-score.js';
export type { ProfessionalReputationScoreProps } from './application/projections/professional-reputation-score.js';
export type { IProfessionalReputationScoreRepository } from './application/projections/i-professional-reputation-score-repository.js';

// ── Application Ports ───────────────────────────────────────────────────────────
export type { IReviewEventPublisher } from './application/ports/i-review-event-publisher.js';

// ── DTOs ───────────────────────────────────────────────────────────────────────
export type {
  SubmitProfessionalReviewInputDTO,
  SubmitProfessionalReviewOutputDTO,
} from './application/dtos/submit-professional-review-dto.js';
export type {
  RespondToProfessionalReviewInputDTO,
  RespondToProfessionalReviewOutputDTO,
} from './application/dtos/respond-to-professional-review-dto.js';
export type {
  FlagProfessionalReviewInputDTO,
  FlagProfessionalReviewOutputDTO,
} from './application/dtos/flag-professional-review-dto.js';
export type {
  HideProfessionalReviewInputDTO,
  HideProfessionalReviewOutputDTO,
} from './application/dtos/hide-professional-review-dto.js';
export type {
  GetProfessionalReviewsInputDTO,
  GetProfessionalReviewsOutputDTO,
  ProfessionalReviewItemDTO,
} from './application/dtos/get-professional-reviews-dto.js';
export type {
  GetProfessionalReputationScoreInputDTO,
  GetProfessionalReputationScoreOutputDTO,
} from './application/dtos/get-professional-reputation-score-dto.js';
export type {
  GetClientReviewsInputDTO,
  GetClientReviewsOutputDTO,
  ClientReviewItemDTO,
} from './application/dtos/get-client-reviews-dto.js';

// ── Use Cases ──────────────────────────────────────────────────────────────────
export { SubmitProfessionalReview } from './application/use-cases/submit-professional-review.js';
export { RespondToProfessionalReview } from './application/use-cases/respond-to-professional-review.js';
export { FlagProfessionalReview } from './application/use-cases/flag-professional-review.js';
export { HideProfessionalReview } from './application/use-cases/hide-professional-review.js';
export { GetProfessionalReviews } from './application/use-cases/get-professional-reviews.js';
export { GetProfessionalReputationScore } from './application/use-cases/get-professional-reputation-score.js';
export { GetClientReviews } from './application/use-cases/get-client-reviews.js';

// ── Event Handlers ─────────────────────────────────────────────────────────────
export { OnProfessionalReviewSubmitted } from './application/event-handlers/on-professional-review-submitted.js';
export { OnProfessionalReviewHidden } from './application/event-handlers/on-professional-review-hidden.js';
