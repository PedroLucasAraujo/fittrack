import { BaseDomainEvent } from '@fittrack/core';

export interface SessionFeedbackHiddenPayload {
  feedbackId: string;
  professionalProfileId: string;
  wasNegative: boolean;
  hiddenAtUtc: string;
}

/**
 * Emitted when an admin hides a session feedback (ADR-0057).
 *
 * Consumers:
 * - OnSessionFeedbackHidden → recalculates risk detection if feedback was negative
 */
export class SessionFeedbackHiddenEvent extends BaseDomainEvent {
  readonly eventType = 'SessionFeedbackHidden';
  readonly aggregateType = 'SessionFeedback';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<SessionFeedbackHiddenPayload>,
  ) {
    super(1);
  }
}
