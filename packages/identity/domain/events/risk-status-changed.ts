import { BaseDomainEvent } from '@fittrack/core';

/**
 * Emitted whenever a ProfessionalProfile's RiskStatus transitions (ADR-0022).
 *
 * Downstream contexts (Billing, Scheduling, Execution) consume this event
 * to enforce operational restrictions. For example, a transition to BANNED
 * triggers AccessGrant suspension and blocks new purchases.
 */
export class RiskStatusChanged extends BaseDomainEvent {
  readonly eventType = 'RiskStatusChanged';
  readonly aggregateType = 'ProfessionalProfile';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      previousStatus: string;
      newStatus: string;
      reason?: string;
    }>,
  ) {
    super(1);
  }
}
