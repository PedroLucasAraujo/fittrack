import { BaseDomainEvent } from '@fittrack/core';

export interface PlatformFeeRecordedPayload {
  readonly ledgerId: string;
  readonly entryId: string;
  readonly executionId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly logicalDay: string;
  readonly balanceAfterCents: number;
}

/** Published when a PLATFORM_FEE LedgerEntry is recorded. ADR-0009 §7. */
export class PlatformFeeRecordedEvent extends BaseDomainEvent {
  readonly eventType = 'PlatformFeeRecorded' as const;
  readonly aggregateType = 'FinancialLedger' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<PlatformFeeRecordedPayload>,
  ) {
    super(1);
  }
}
