import {
  AggregateRoot,
  DomainInvariantError,
  DomainResult,
  ErrorCodes,
  Money,
  UTCDateTime,
  generateId,
  left,
  right,
} from '@fittrack/core';
import { LedgerEntry } from '../entities/ledger-entry.js';
import { LedgerEntryType } from '../enums/ledger-entry-type.js';
import { LedgerStatus } from '../enums/ledger-status.js';
import { InsufficientBalanceError } from '../errors/insufficient-balance-error.js';
import { InvalidLedgerStatusTransitionError } from '../errors/invalid-ledger-status-transition-error.js';
import { LedgerFrozenError } from '../errors/ledger-frozen-error.js';
import { LedgerUnderReviewError } from '../errors/ledger-under-review-error.js';

export interface FinancialLedgerProps {
  readonly professionalProfileId: string;
  /**
   * Signed integer. May be negative during overdraft states (ADR-0021 §8).
   * currentBalanceCents = sum of all REVENUE entries
   *                      − sum of all PLATFORM_FEE entries
   *                      − sum of all REFUND debit entries
   *                      + sum of all REFUND credit entries (fee reversals)
   *                      − sum of all PAYOUT entries
   *                      +/− ADJUSTMENT entries
   */
  currentBalanceCents: number;
  readonly currency: string;
  status: LedgerStatus;
  lastReconciledAtUtc: UTCDateTime | null;
  /**
   * Entries loaded from persistence (for query paths).
   * On mutation paths the repository loads only the header; this array may be empty.
   */
  entries: LedgerEntry[];
}

/**
 * FinancialLedger — Aggregate Root for the Ledger bounded context.
 *
 * One FinancialLedger exists per professionalProfileId (tenant).
 * Enforces append-only LedgerEntry semantics and balance consistency.
 *
 * ADR-0021: Immutable Financial Ledger
 * ADR-0047: Canonical Aggregate Root Definition
 */
export class FinancialLedger extends AggregateRoot<FinancialLedgerProps> {
  /**
   * Tracks newly appended entries during this operation.
   * Repository saves only _newEntries + updated header (optimized; see ADR-0021 §11).
   */
  private _newEntries: LedgerEntry[] = [];

  private constructor(id: string, props: FinancialLedgerProps, version: number = 0) {
    super(id, props, version);
  }

  // ── Factory ──────────────────────────────────────────────────────────────────

  /**
   * Creates a new FinancialLedger for a professional. Balance starts at zero.
   * Created lazily on first financial event for the professional.
   */
  static create(props: {
    id?: string;
    professionalProfileId: string;
    currency: string;
  }): DomainResult<FinancialLedger> {
    const CURRENCY_REGEX = /^[A-Z]{3}$/;
    if (!CURRENCY_REGEX.test(props.currency)) {
      return left(
        new DomainInvariantError(
          `FinancialLedger currency must be a 3-letter ISO 4217 uppercase code. Received: "${props.currency}".`,
          ErrorCodes.INVALID_CURRENCY,
          { currency: props.currency },
        ),
      );
    }

    const id = props.id ?? generateId();
    return right(
      new FinancialLedger(
        id,
        {
          professionalProfileId: props.professionalProfileId,
          currentBalanceCents: 0,
          currency: props.currency,
          status: LedgerStatus.ACTIVE,
          lastReconciledAtUtc: null,
          entries: [],
        },
        0,
      ),
    );
  }

  /**
   * Reconstitutes a FinancialLedger from persistence.
   * `props.entries` may be empty (mutation path) or populated (query path).
   */
  static reconstitute(id: string, props: FinancialLedgerProps, version: number): FinancialLedger {
    return new FinancialLedger(id, props, version);
  }

  // ── Revenue Recording ─────────────────────────────────────────────────────

  /**
   * Records professional net revenue for one confirmed session (REVENUE entry).
   * Must be called in the same UseCase transaction as recordPlatformFee for the same executionId.
   * ADR-0009 §1.5: both entries must be atomic within one UseCase transaction.
   */
  recordRevenue(props: {
    transactionId: string;
    amount: Money;
    idempotencyKey: string;
    description: string;
  }): DomainResult<LedgerEntry> {
    const existing = this.findEntryByIdempotencyKey(props.idempotencyKey);
    if (existing) return right(existing);

    const newBalanceCents = this.props.currentBalanceCents + props.amount.amount;
    return right(
      this.appendEntry({
        ledgerEntryType: LedgerEntryType.REVENUE,
        amount: props.amount,
        balanceAfterCents: newBalanceCents,
        transactionId: props.transactionId,
        referenceEntryId: null,
        idempotencyKey: props.idempotencyKey,
        description: props.description,
      }),
    );
  }

  /**
   * Records platform fee deduction for one confirmed session (PLATFORM_FEE entry).
   * Must be called in the same UseCase transaction as recordRevenue for the same executionId.
   */
  recordPlatformFee(props: {
    transactionId: string;
    amount: Money;
    idempotencyKey: string;
    description: string;
  }): DomainResult<LedgerEntry> {
    const existing = this.findEntryByIdempotencyKey(props.idempotencyKey);
    if (existing) return right(existing);

    const newBalanceCents = this.props.currentBalanceCents - props.amount.amount;
    return right(
      this.appendEntry({
        ledgerEntryType: LedgerEntryType.PLATFORM_FEE,
        amount: props.amount,
        balanceAfterCents: newBalanceCents,
        transactionId: props.transactionId,
        referenceEntryId: null,
        idempotencyKey: props.idempotencyKey,
        description: props.description,
      }),
    );
  }

  // ── Refund Recording ──────────────────────────────────────────────────────

  /**
   * Records a refund entry that reverses a prior REVENUE or PLATFORM_FEE entry.
   * For REVENUE reversals: debit (decreases balance).
   * For PLATFORM_FEE reversals: credit (increases balance — platform returns the fee).
   */
  recordRefund(props: {
    transactionId: string;
    amount: Money;
    referenceEntryId: string;
    isRevenueReversal: boolean;
    idempotencyKey: string;
    description: string;
  }): DomainResult<LedgerEntry> {
    const existing = this.findEntryByIdempotencyKey(props.idempotencyKey);
    if (existing) return right(existing);

    const delta = props.isRevenueReversal
      ? -props.amount.amount // debit: revenue reversed
      : +props.amount.amount; // credit: fee reversed (platform returns fee)

    const newBalanceCents = this.props.currentBalanceCents + delta;
    return right(
      this.appendEntry({
        ledgerEntryType: LedgerEntryType.REFUND,
        amount: props.amount,
        balanceAfterCents: newBalanceCents,
        transactionId: props.transactionId,
        referenceEntryId: props.referenceEntryId,
        idempotencyKey: props.idempotencyKey,
        description: props.description,
      }),
    );
  }

  // ── Payout Recording ──────────────────────────────────────────────────────

  /**
   * Records a payout transfer from the professional's ledger balance to their bank account.
   * Blocked when: ledger is FROZEN, ledger is UNDER_REVIEW, or balance is insufficient.
   */
  recordPayout(props: {
    amount: Money;
    idempotencyKey: string;
    description: string;
  }): DomainResult<LedgerEntry> {
    const existing = this.findEntryByIdempotencyKey(props.idempotencyKey);
    if (existing) return right(existing);

    if (this.props.status === LedgerStatus.FROZEN) {
      return left(new LedgerFrozenError(this._id));
    }

    if (this.props.status === LedgerStatus.UNDER_REVIEW) {
      return left(new LedgerUnderReviewError(this._id));
    }

    if (this.props.currentBalanceCents < props.amount.amount) {
      return left(new InsufficientBalanceError(this._id));
    }

    const newBalanceCents = this.props.currentBalanceCents - props.amount.amount;
    return right(
      this.appendEntry({
        ledgerEntryType: LedgerEntryType.PAYOUT,
        amount: props.amount,
        balanceAfterCents: newBalanceCents,
        transactionId: null,
        referenceEntryId: null,
        idempotencyKey: props.idempotencyKey,
        description: props.description,
      }),
    );
  }

  // ── Adjustment Recording ──────────────────────────────────────────────────

  /**
   * Records an administrative adjustment entry. Can be credit or debit.
   * `isCredit` = true → increases balance. `isCredit` = false → decreases balance.
   * Requires explicit administrative authorization (caller is responsible for auth check).
   */
  recordAdjustment(props: {
    amount: Money;
    isCredit: boolean;
    idempotencyKey: string;
    description: string;
  }): DomainResult<LedgerEntry> {
    const existing = this.findEntryByIdempotencyKey(props.idempotencyKey);
    if (existing) return right(existing);

    const delta = props.isCredit ? +props.amount.amount : -props.amount.amount;
    const newBalanceCents = this.props.currentBalanceCents + delta;

    return right(
      this.appendEntry({
        ledgerEntryType: LedgerEntryType.ADJUSTMENT,
        amount: props.amount,
        balanceAfterCents: newBalanceCents,
        transactionId: null,
        referenceEntryId: null,
        idempotencyKey: props.idempotencyKey,
        description: props.description,
      }),
    );
  }

  // ── Status Transitions ────────────────────────────────────────────────────

  freeze(): DomainResult<void> {
    if (this.props.status === LedgerStatus.FROZEN) {
      return left(new InvalidLedgerStatusTransitionError(LedgerStatus.FROZEN, LedgerStatus.FROZEN));
    }
    this.props.status = LedgerStatus.FROZEN;
    return right(undefined);
  }

  unfreeze(): DomainResult<void> {
    if (this.props.status !== LedgerStatus.FROZEN) {
      return left(new InvalidLedgerStatusTransitionError(this.props.status, LedgerStatus.ACTIVE));
    }
    this.props.status = LedgerStatus.ACTIVE;
    return right(undefined);
  }

  markUnderReview(): DomainResult<void> {
    if (this.props.status === LedgerStatus.UNDER_REVIEW) {
      return left(
        new InvalidLedgerStatusTransitionError(
          LedgerStatus.UNDER_REVIEW,
          LedgerStatus.UNDER_REVIEW,
        ),
      );
    }
    this.props.status = LedgerStatus.UNDER_REVIEW;
    return right(undefined);
  }

  clearReview(): DomainResult<void> {
    if (this.props.status !== LedgerStatus.UNDER_REVIEW) {
      return left(new InvalidLedgerStatusTransitionError(this.props.status, LedgerStatus.ACTIVE));
    }
    this.props.status = LedgerStatus.ACTIVE;
    return right(undefined);
  }

  markReconciled(): void {
    this.props.lastReconciledAtUtc = UTCDateTime.now();
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private findEntryByIdempotencyKey(key: string): LedgerEntry | undefined {
    return (
      this.props.entries.find((e) => e.idempotencyKey === key) ??
      this._newEntries.find((e) => e.idempotencyKey === key)
    );
  }

  private appendEntry(
    entryProps: Omit<Parameters<typeof LedgerEntry.create>[0], 'id'>,
  ): LedgerEntry {
    const entry = LedgerEntry.create(entryProps);
    this.props.currentBalanceCents = entry.balanceAfterCents;
    this._newEntries.push(entry);
    this.props.entries.push(entry);
    return entry;
  }

  // ── Read Model Helpers ─────────────────────────────────────────────────────

  /**
   * Returns only entries added during this operation (for repository save optimization).
   * See ADR-0021 §11.
   */
  getNewEntries(): ReadonlyArray<LedgerEntry> {
    return [...this._newEntries];
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  /** Signed integer balance in cents. May be negative during overdraft (ADR-0021 §8). */
  get currentBalanceCents(): number {
    return this.props.currentBalanceCents;
  }

  get currency(): string {
    return this.props.currency;
  }

  get status(): LedgerStatus {
    return this.props.status;
  }

  /** Returns true when the balance is negative — triggers Risk escalation (ADR-0021 §8). */
  get isInDebt(): boolean {
    return this.props.currentBalanceCents < 0;
  }

  get lastReconciledAtUtc(): UTCDateTime | null {
    return this.props.lastReconciledAtUtc;
  }

  /**
   * All entries (loaded from persistence + newly added in current operation).
   * On mutation paths this only contains newly added entries.
   */
  get entries(): ReadonlyArray<LedgerEntry> {
    return [...this.props.entries];
  }
}
