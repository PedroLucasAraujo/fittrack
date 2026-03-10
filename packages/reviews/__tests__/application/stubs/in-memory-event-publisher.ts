import type { IReviewEventPublisher } from '../../../application/ports/i-review-event-publisher.js';
import type { ProfessionalReviewSubmittedEvent } from '../../../domain/events/professional-review-submitted-event.js';
import type { ProfessionalReviewRespondedEvent } from '../../../domain/events/professional-review-responded-event.js';
import type { ProfessionalReviewFlaggedEvent } from '../../../domain/events/professional-review-flagged-event.js';
import type { ProfessionalReviewHiddenEvent } from '../../../domain/events/professional-review-hidden-event.js';

export class InMemoryEventPublisher implements IReviewEventPublisher {
  submittedEvents: ProfessionalReviewSubmittedEvent[] = [];
  respondedEvents: ProfessionalReviewRespondedEvent[] = [];
  flaggedEvents: ProfessionalReviewFlaggedEvent[] = [];
  hiddenEvents: ProfessionalReviewHiddenEvent[] = [];

  async publishReviewSubmitted(event: ProfessionalReviewSubmittedEvent): Promise<void> {
    this.submittedEvents.push(event);
  }

  async publishReviewResponded(event: ProfessionalReviewRespondedEvent): Promise<void> {
    this.respondedEvents.push(event);
  }

  async publishReviewFlagged(event: ProfessionalReviewFlaggedEvent): Promise<void> {
    this.flaggedEvents.push(event);
  }

  async publishReviewHidden(event: ProfessionalReviewHiddenEvent): Promise<void> {
    this.hiddenEvents.push(event);
  }
}
