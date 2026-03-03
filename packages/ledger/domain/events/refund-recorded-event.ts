import { BaseDomainEvent } from '@fittrack/core';

export interface RefundRecordedPayload {
  readonly ledgerId: string;
  readonly entryId: string;
  readonly referenceEntryId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly balanceAfterCents: number;
  readonly reason: string;
}

/** Published when a REFUND LedgerEntry is recorded. ADR-0009 §7. */
export class RefundRecordedEvent extends BaseDomainEvent {
  readonly eventType = 'RefundRecorded' as const;
  readonly aggregateType = 'FinancialLedger' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<RefundRecordedPayload>,
  ) {
    super(1);
  }
}
