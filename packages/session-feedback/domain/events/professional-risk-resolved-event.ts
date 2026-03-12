import { BaseDomainEvent } from '@fittrack/core';

export interface ProfessionalRiskResolvedPayload {
  professionalProfileId: string;
  negativeFeedbackCount: number;
  windowDays: number;
  resolvedAtUtc: string;
}

/**
 * Emitted when a professional's negative feedback count drops below all risk
 * thresholds within the rolling window (ADR-0057 §5).
 *
 * Consumers:
 * - Risk module → clears ProfessionalProfile RiskStatus (WATCHLIST/FLAGGED → CLEAR)
 */
export class ProfessionalRiskResolvedEvent extends BaseDomainEvent {
  readonly eventType = 'ProfessionalRiskResolved';
  readonly aggregateType = 'SessionFeedback';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ProfessionalRiskResolvedPayload>,
  ) {
    super(1);
  }
}
