import { BaseDomainEvent } from '@fittrack/core';

export interface SessionFeedbackFlaggedPayload {
  feedbackId: string;
  bookingId: string;
  professionalProfileId: string;
  flagReason: string;
  flaggedAtUtc: string;
}

/**
 * Emitted when a feedback is flagged for moderation review (ADR-0057).
 *
 * Consumers:
 * - Admin notification service → alerts admins for moderation
 */
export class SessionFeedbackFlaggedEvent extends BaseDomainEvent {
  readonly eventType = 'SessionFeedbackFlagged';
  readonly aggregateType = 'SessionFeedback';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<SessionFeedbackFlaggedPayload>,
  ) {
    super(1);
  }
}
