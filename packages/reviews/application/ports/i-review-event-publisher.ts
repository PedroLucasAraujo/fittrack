import type { ProfessionalReviewSubmittedEvent } from '../../domain/events/professional-review-submitted-event.js';
import type { ProfessionalReviewRespondedEvent } from '../../domain/events/professional-review-responded-event.js';
import type { ProfessionalReviewFlaggedEvent } from '../../domain/events/professional-review-flagged-event.js';
import type { ProfessionalReviewHiddenEvent } from '../../domain/events/professional-review-hidden-event.js';

/**
 * Port for publishing review domain events after transaction commit (ADR-0009 §4).
 */
export interface IReviewEventPublisher {
  publishReviewSubmitted(event: ProfessionalReviewSubmittedEvent): Promise<void>;
  publishReviewResponded(event: ProfessionalReviewRespondedEvent): Promise<void>;
  publishReviewFlagged(event: ProfessionalReviewFlaggedEvent): Promise<void>;
  publishReviewHidden(event: ProfessionalReviewHiddenEvent): Promise<void>;
}
