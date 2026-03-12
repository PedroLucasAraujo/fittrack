import type { SessionFeedbackSubmittedEvent } from '../../domain/events/session-feedback-submitted-event.js';
import type { SessionFeedbackFlaggedEvent } from '../../domain/events/session-feedback-flagged-event.js';
import type { SessionFeedbackHiddenEvent } from '../../domain/events/session-feedback-hidden-event.js';
import type { ProfessionalRiskDetectedEvent } from '../../domain/events/professional-risk-detected-event.js';
import type { ProfessionalRiskResolvedEvent } from '../../domain/events/professional-risk-resolved-event.js';

/**
 * Event publisher port for the SessionFeedback bounded context (ADR-0047 §4).
 *
 * Events are published post-commit only. Implementations route to the
 * application event bus (in-process) or a message broker for cross-context delivery.
 */
export interface ISessionFeedbackEventPublisher {
  publishFeedbackSubmitted(event: SessionFeedbackSubmittedEvent): Promise<void>;
  publishFeedbackFlagged(event: SessionFeedbackFlaggedEvent): Promise<void>;
  publishFeedbackHidden(event: SessionFeedbackHiddenEvent): Promise<void>;
  publishProfessionalRiskDetected(event: ProfessionalRiskDetectedEvent): Promise<void>;
  publishProfessionalRiskResolved(event: ProfessionalRiskResolvedEvent): Promise<void>;
}
