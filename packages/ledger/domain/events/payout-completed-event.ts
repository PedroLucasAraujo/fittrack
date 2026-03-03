import { BaseDomainEvent } from '@fittrack/core';

export interface PayoutCompletedPayload {
  readonly ledgerId: string;
  readonly entryId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly balanceAfterCents: number;
}

/** Published when a PAYOUT LedgerEntry is recorded. ADR-0009 §7. Consumed by Notifications. */
export class PayoutCompletedEvent extends BaseDomainEvent {
  readonly eventType = 'PayoutCompleted' as const;
  readonly aggregateType = 'FinancialLedger' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<PayoutCompletedPayload>,
  ) {
    super(1);
  }
}
