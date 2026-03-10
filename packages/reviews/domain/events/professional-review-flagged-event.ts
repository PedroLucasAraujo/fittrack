import { BaseDomainEvent } from '@fittrack/core';

export interface ProfessionalReviewFlaggedPayload {
  readonly reviewId: string;
  readonly professionalProfileId: string;
  readonly flaggedBy: string;
  readonly reason: string;
  readonly flaggedAtUtc: string;
}

/**
 * Emitted after a review is flagged for moderation.
 *
 * Consumed by:
 * - Notification module → notify platform moderators
 *
 * eventVersion: 1
 */
export class ProfessionalReviewFlaggedEvent extends BaseDomainEvent {
  readonly eventType = 'ProfessionalReviewFlagged' as const;
  readonly aggregateType = 'ProfessionalReview' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ProfessionalReviewFlaggedPayload>,
  ) {
    super(1);
  }
}
