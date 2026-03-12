import { BaseDomainEvent } from '@fittrack/core';

export interface SessionFeedbackSubmittedPayload {
  feedbackId: string;
  bookingId: string;
  clientId: string;
  professionalProfileId: string;
  rating: number;
  isNegative: boolean;
  sessionDate: string;
  submittedAtUtc: string;
}

/**
 * Emitted when a client submits feedback for a completed session (ADR-0057).
 *
 * Consumers:
 * - OnSessionFeedbackSubmitted → triggers risk detection when isNegative=true
 * - Notification service → notifies professional of new feedback
 */
export class SessionFeedbackSubmittedEvent extends BaseDomainEvent {
  readonly eventType = 'SessionFeedbackSubmitted';
  readonly aggregateType = 'SessionFeedback';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<SessionFeedbackSubmittedPayload>,
  ) {
    super(1);
  }
}
