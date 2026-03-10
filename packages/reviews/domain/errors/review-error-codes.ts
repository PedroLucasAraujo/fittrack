/**
 * Error code registry for the Reviews bounded context.
 *
 * Namespaced with `REVIEWS.` prefix to avoid collisions with
 * core ErrorCodes and codes from other bounded contexts.
 */
export const ReviewErrorCodes = {
  INVALID_REVIEW: 'REVIEWS.INVALID_REVIEW',
  REVIEW_NOT_FOUND: 'REVIEWS.REVIEW_NOT_FOUND',
  INVALID_RATING: 'REVIEWS.INVALID_RATING',
  INVALID_COMMENT: 'REVIEWS.INVALID_COMMENT',
  INSUFFICIENT_SESSIONS: 'REVIEWS.INSUFFICIENT_SESSIONS',
  DUPLICATE_REVIEW: 'REVIEWS.DUPLICATE_REVIEW',
  REVIEW_ALREADY_RESPONDED: 'REVIEWS.REVIEW_ALREADY_RESPONDED',
  REVIEW_ALREADY_FLAGGED: 'REVIEWS.REVIEW_ALREADY_FLAGGED',
  UNAUTHORIZED_REVIEW_ACTION: 'REVIEWS.UNAUTHORIZED_REVIEW_ACTION',
} as const;

export type ReviewErrorCode = (typeof ReviewErrorCodes)[keyof typeof ReviewErrorCodes];
