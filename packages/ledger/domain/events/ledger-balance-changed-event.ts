import { BaseDomainEvent } from '@fittrack/core';
import { LedgerEntryType } from '../enums/ledger-entry-type.js';

export interface LedgerBalanceChangedPayload {
  readonly ledgerId: string;
  readonly previousBalanceCents: number;
  readonly newBalanceCents: number;
  readonly currency: string;
  readonly entryType: LedgerEntryType;
  /**
   * true when newBalanceCents < 0. Consumed by Risk context to trigger WATCHLIST escalation.
   * ADR-0021 §8, ADR-0022.
   */
  readonly isInDebt: boolean;
}

/**
 * Published after every LedgerEntry is recorded.
 * Consumed by Risk context: when isInDebt=true → escalates professional to WATCHLIST.
 * ADR-0009 §7.
 */
export class LedgerBalanceChangedEvent extends BaseDomainEvent {
  readonly eventType = 'LedgerBalanceChanged' as const;
  readonly aggregateType = 'FinancialLedger' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<LedgerBalanceChangedPayload>,
  ) {
    super(1);
  }
}
