import { BaseDomainEvent } from '@fittrack/core';

export interface RevenueRecordedPayload {
  readonly ledgerId: string;
  readonly entryId: string;
  readonly executionId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly logicalDay: string;
  readonly balanceAfterCents: number;
}

/** Published when a REVENUE LedgerEntry is recorded. ADR-0009 §7. */
export class RevenueRecordedEvent extends BaseDomainEvent {
  readonly eventType = 'RevenueRecorded' as const;
  readonly aggregateType = 'FinancialLedger' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<RevenueRecordedPayload>,
  ) {
    super(1);
  }
}
