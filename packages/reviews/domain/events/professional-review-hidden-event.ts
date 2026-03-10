import { BaseDomainEvent } from '@fittrack/core';

export interface ProfessionalReviewHiddenPayload {
  readonly reviewId: string;
  readonly professionalProfileId: string;
  readonly hiddenBy: string;
  readonly overallRating: number;
  readonly ratings: {
    readonly professionalism: number;
    readonly communication: number;
    readonly technicalKnowledge: number;
    readonly punctuality: number;
    readonly results: number;
  };
  readonly wouldRecommend: boolean;
  readonly hiddenAtUtc: string;
}

/**
 * Emitted after an admin hides a review (soft delete).
 *
 * Consumed by:
 * - OnProfessionalReviewHidden handler → subtracts review from reputation score read model
 *
 * eventVersion: 1
 */
export class ProfessionalReviewHiddenEvent extends BaseDomainEvent {
  readonly eventType = 'ProfessionalReviewHidden' as const;
  readonly aggregateType = 'ProfessionalReview' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ProfessionalReviewHiddenPayload>,
  ) {
    super(1);
  }
}
