import { BaseDomainEvent } from '@fittrack/core';

/**
 * Emitted whenever a ProfessionalProfile's RiskStatus transitions (ADR-0022).
 *
 * Downstream contexts (Billing, Scheduling, Execution) consume this event
 * to enforce operational restrictions. For example, a transition to BANNED
 * triggers AccessGrant suspension and blocks new purchases.
 *
 * ## Schema changelog
 *
 * - v2 (current): `reason` is now required; `evidenceRef` added (chargeback ID,
 *   report ID, or null for manual admin actions). Producer context corrected
 *   to Risk (ADR-0009 §7 amended).
 * - v1: `{ previousStatus, newStatus, reason? }` — produced by Identity context.
 *
 * eventVersion: 2
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
      /** Why the status changed. Required for audit and downstream context consumers. */
      reason: string;
      /**
       * Reference ID for the evidence that triggered this transition
       * (e.g. transactionId for chargeback-triggered escalation, or null for admin actions).
       * Must not contain PII — reference IDs only (ADR-0037).
       */
      evidenceRef: string | null;
    }>,
  ) {
    super(2);
  }
}
