import { BaseDomainEvent } from '@fittrack/core';
import { LedgerStatus } from '../enums/ledger-status.js';

export interface LedgerStatusChangedPayload {
  readonly ledgerId: string;
  readonly previousStatus: LedgerStatus;
  readonly newStatus: LedgerStatus;
  readonly reason: string;
}

/** Published when FinancialLedger status transitions (freeze, unfreeze, review). ADR-0009 §7. */
export class LedgerStatusChangedEvent extends BaseDomainEvent {
  readonly eventType = 'LedgerStatusChanged' as const;
  readonly aggregateType = 'FinancialLedger' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<LedgerStatusChangedPayload>,
  ) {
    super(1);
  }
}
