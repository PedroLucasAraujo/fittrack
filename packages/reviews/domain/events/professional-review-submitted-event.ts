import { BaseDomainEvent } from '@fittrack/core';

/**
 * Payload for ProfessionalReviewSubmitted (ADR-0037: no PII).
 * Carries data needed for the reputation score projection handler.
 */
export interface ProfessionalReviewSubmittedPayload {
  readonly reviewId: string;
  readonly professionalProfileId: string;
  readonly clientId: string;
  readonly overallRating: number;
  readonly ratings: {
    readonly professionalism: number;
    readonly communication: number;
    readonly technicalKnowledge: number;
    readonly punctuality: number;
    readonly results: number;
  };
  readonly wouldRecommend: boolean;
  readonly verifiedInteraction: boolean;
  readonly sessionCountAtReview: number;
  readonly submittedAtUtc: string;
}

/**
 * Emitted after a client successfully submits a verified review.
 *
 * Consumed by:
 * - OnProfessionalReviewSubmitted handler → updates ProfessionalReputationScore read model
 * - Notification module → optional "new review" alert to professional
 *
 * eventVersion: 1
 */
export class ProfessionalReviewSubmittedEvent extends BaseDomainEvent {
  readonly eventType = 'ProfessionalReviewSubmitted' as const;
  readonly aggregateType = 'ProfessionalReview' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ProfessionalReviewSubmittedPayload>,
  ) {
    super(1);
  }
}
