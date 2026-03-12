import { BaseDomainEvent } from '@fittrack/core';

export type FeedbackRiskType = 'NEGATIVE_SESSION_FEEDBACK';

export interface ProfessionalRiskDetectedPayload {
  professionalProfileId: string;
  riskType: FeedbackRiskType;
  negativeFeedbackCount: number;
  windowDays: number;
  threshold: number;
  detectedAtUtc: string;
}

/**
 * Emitted when a professional crosses the negative feedback threshold (ADR-0057).
 *
 * Thresholds:
 * - ≥5 negative feedbacks in 30 days → WATCHLIST
 * - ≥10 negative feedbacks in 30 days → FLAGGED
 *
 * Consumers:
 * - Risk module → updates ProfessionalProfile RiskStatus
 */
export class ProfessionalRiskDetectedEvent extends BaseDomainEvent {
  readonly eventType = 'ProfessionalRiskDetected';
  readonly aggregateType = 'SessionFeedback';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ProfessionalRiskDetectedPayload>,
  ) {
    super(1);
  }
}
