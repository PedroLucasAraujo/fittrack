import { BaseDomainEvent } from '@fittrack/core';

export interface ProfessionalReviewRespondedPayload {
  readonly reviewId: string;
  readonly professionalProfileId: string;
  readonly clientId: string;
  readonly respondedAtUtc: string;
}

/**
 * Emitted after a professional responds (or updates their response) to a review.
 *
 * Consumed by:
 * - Notification module → notify client that professional responded
 *
 * eventVersion: 1
 */
export class ProfessionalReviewRespondedEvent extends BaseDomainEvent {
  readonly eventType = 'ProfessionalReviewResponded' as const;
  readonly aggregateType = 'ProfessionalReview' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ProfessionalReviewRespondedPayload>,
  ) {
    super(1);
  }
}
