import { BaseEntity, Money, UTCDateTime, generateId } from '@fittrack/core';
import { LedgerEntryType } from '../enums/ledger-entry-type.js';

export interface LedgerEntryProps {
  readonly ledgerEntryType: LedgerEntryType;
  /**
   * Non-negative amount. The LedgerEntryType determines whether this is a credit or debit.
   * REVENUE: credit (+). PLATFORM_FEE: debit (−). REFUND: debit (−) or credit (+) for fee reversals.
   * PAYOUT: debit (−). ADJUSTMENT: either direction based on context (stored as non-negative; sign tracked separately).
   */
  readonly amount: Money;
  /**
   * Signed integer snapshot of FinancialLedger.currentBalanceCents immediately after this entry was applied.
   */
  readonly balanceAfterCents: number;
  /**
   * Reference to the source Transaction in the Billing context. Null for PAYOUT and ADJUSTMENT entries.
   */
  readonly transactionId: string | null;
  /**
   * Reference to the original LedgerEntry being reversed. Only set for REFUND entries.
   */
  readonly referenceEntryId: string | null;
  /**
   * Idempotency key preventing duplicate entries on retry. Format depends on entry type:
   * - REVENUE/PLATFORM_FEE: "revenue:{executionId}" / "fee:{executionId}"
   * - REFUND: "refund:{chargebackId}:{originalEntryId}"
   * - PAYOUT: "payout:{payoutRequestId}"
   * - ADJUSTMENT: "adj:{adjustmentId}"
   */
  readonly idempotencyKey: string;
  readonly description: string;
  readonly occurredAtUtc: UTCDateTime;
}

/**
 * Immutable subordinate entity of FinancialLedger.
 * LedgerEntry records are never updated or deleted after creation (ADR-0021 Invariant 1).
 * Accessible only through the FinancialLedger aggregate root (ADR-0047).
 */
export class LedgerEntry extends BaseEntity<LedgerEntryProps> {
  private constructor(id: string, props: LedgerEntryProps) {
    super(id, props);
  }

  /**
   * Creates a new immutable LedgerEntry. Called exclusively from FinancialLedger domain methods.
   * All business validation (balance, status, idempotency) must be performed by the caller
   * before invoking this factory.
   */
  static create(props: Omit<LedgerEntryProps, 'occurredAtUtc'> & { id?: string }): LedgerEntry {
    const id = props.id ?? generateId();
    return new LedgerEntry(id, {
      ledgerEntryType: props.ledgerEntryType,
      amount: props.amount,
      balanceAfterCents: props.balanceAfterCents,
      transactionId: props.transactionId,
      referenceEntryId: props.referenceEntryId,
      idempotencyKey: props.idempotencyKey,
      description: props.description,
      occurredAtUtc: UTCDateTime.now(),
    });
  }

  /**
   * Reconstitutes a LedgerEntry from persistence. Used by repository mappers only.
   */
  static reconstitute(id: string, props: LedgerEntryProps): LedgerEntry {
    return new LedgerEntry(id, props);
  }

  get ledgerEntryType(): LedgerEntryType {
    return this.props.ledgerEntryType;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get balanceAfterCents(): number {
    return this.props.balanceAfterCents;
  }

  get transactionId(): string | null {
    return this.props.transactionId;
  }

  get referenceEntryId(): string | null {
    return this.props.referenceEntryId;
  }

  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }

  get description(): string {
    return this.props.description;
  }

  get occurredAtUtc(): UTCDateTime {
    return this.props.occurredAtUtc;
  }
}
