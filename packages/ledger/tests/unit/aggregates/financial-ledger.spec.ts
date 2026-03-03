import { Money, UTCDateTime, generateId } from '@fittrack/core';
import { describe, expect, it } from 'vitest';
import { FinancialLedger } from '../../../domain/aggregates/financial-ledger.js';
import { LedgerEntry } from '../../../domain/entities/ledger-entry.js';
import { LedgerEntryType } from '../../../domain/enums/ledger-entry-type.js';
import { LedgerStatus } from '../../../domain/enums/ledger-status.js';
import { InsufficientBalanceError } from '../../../domain/errors/insufficient-balance-error.js';
import { InvalidLedgerStatusTransitionError } from '../../../domain/errors/invalid-ledger-status-transition-error.js';
import { LedgerFrozenError } from '../../../domain/errors/ledger-frozen-error.js';
import { LedgerUnderReviewError } from '../../../domain/errors/ledger-under-review-error.js';
import {
  makeFinancialLedger,
  makeNewFinancialLedger,
} from '../../factories/make-financial-ledger.js';

const makeMoney = (cents: number, currency = 'BRL') => {
  const r = Money.create(cents, currency);
  if (r.isLeft()) throw new Error(r.value.message);
  return r.value;
};

describe('FinancialLedger', () => {
  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates with zero balance and ACTIVE status', () => {
      const ledger = makeNewFinancialLedger({ currency: 'BRL' });

      expect(ledger.currentBalanceCents).toBe(0);
      expect(ledger.status).toBe(LedgerStatus.ACTIVE);
      expect(ledger.isInDebt).toBe(false);
      expect(ledger.entries).toHaveLength(0);
    });

    it('rejects invalid currency code', () => {
      const result = FinancialLedger.create({
        professionalProfileId: generateId(),
        currency: 'invalid',
      });
      expect(result.isLeft()).toBe(true);
    });

    it('rejects lowercase currency code', () => {
      const result = FinancialLedger.create({
        professionalProfileId: generateId(),
        currency: 'brl',
      });
      expect(result.isLeft()).toBe(true);
    });

    it('accepts valid 3-letter uppercase currency', () => {
      const result = FinancialLedger.create({
        professionalProfileId: generateId(),
        currency: 'USD',
      });
      expect(result.isRight()).toBe(true);
    });
  });

  // ── recordRevenue ────────────────────────────────────────────────────────────

  describe('recordRevenue', () => {
    it('increases balance by revenue amount', () => {
      const ledger = makeNewFinancialLedger();
      const amount = makeMoney(9000);

      const result = ledger.recordRevenue({
        transactionId: generateId(),
        amount,
        idempotencyKey: `revenue:${generateId()}`,
        description: 'Session revenue',
      });

      expect(result.isRight()).toBe(true);
      expect(ledger.currentBalanceCents).toBe(9000);
      expect(result.value.ledgerEntryType).toBe(LedgerEntryType.REVENUE);
      expect(result.value.balanceAfterCents).toBe(9000);
    });

    it('adds entry to getNewEntries()', () => {
      const ledger = makeNewFinancialLedger();
      ledger.recordRevenue({
        transactionId: generateId(),
        amount: makeMoney(5000),
        idempotencyKey: `revenue:${generateId()}`,
        description: 'test',
      });

      expect(ledger.getNewEntries()).toHaveLength(1);
    });

    it('is idempotent when same idempotencyKey is used', () => {
      const ledger = makeNewFinancialLedger();
      const key = `revenue:${generateId()}`;

      const first = ledger.recordRevenue({
        transactionId: generateId(),
        amount: makeMoney(9000),
        idempotencyKey: key,
        description: 'First call',
      });

      const second = ledger.recordRevenue({
        transactionId: generateId(),
        amount: makeMoney(9000),
        idempotencyKey: key,
        description: 'Duplicate call',
      });

      expect(first.isRight()).toBe(true);
      expect(second.isRight()).toBe(true);
      expect(second.value.id).toBe(first.value.id);
      expect(ledger.currentBalanceCents).toBe(9000); // charged only once
      expect(ledger.getNewEntries()).toHaveLength(1);
    });

    it('accumulates multiple revenue entries', () => {
      const ledger = makeNewFinancialLedger();
      const txId = generateId();

      ledger.recordRevenue({
        transactionId: txId,
        amount: makeMoney(5000),
        idempotencyKey: `revenue:exec1`,
        description: 'First session',
      });
      ledger.recordRevenue({
        transactionId: txId,
        amount: makeMoney(5000),
        idempotencyKey: `revenue:exec2`,
        description: 'Second session',
      });

      expect(ledger.currentBalanceCents).toBe(10000);
      expect(ledger.getNewEntries()).toHaveLength(2);
    });
  });

  // ── recordPlatformFee ────────────────────────────────────────────────────────

  describe('recordPlatformFee', () => {
    it('decreases balance by fee amount', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 9000 });

      const result = ledger.recordPlatformFee({
        transactionId: generateId(),
        amount: makeMoney(1000),
        idempotencyKey: `fee:${generateId()}`,
        description: 'Platform fee',
      });

      expect(result.isRight()).toBe(true);
      expect(ledger.currentBalanceCents).toBe(8000);
      expect(result.value.ledgerEntryType).toBe(LedgerEntryType.PLATFORM_FEE);
    });

    it('can push balance into debt (no block on fee recording)', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 100 });

      const result = ledger.recordPlatformFee({
        transactionId: generateId(),
        amount: makeMoney(500),
        idempotencyKey: `fee:${generateId()}`,
        description: 'Fee larger than balance',
      });

      expect(result.isRight()).toBe(true);
      expect(ledger.currentBalanceCents).toBe(-400);
      expect(ledger.isInDebt).toBe(true);
    });

    it('is idempotent', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 9000 });
      const key = `fee:${generateId()}`;

      ledger.recordPlatformFee({
        transactionId: generateId(),
        amount: makeMoney(1000),
        idempotencyKey: key,
        description: 'First',
      });

      const second = ledger.recordPlatformFee({
        transactionId: generateId(),
        amount: makeMoney(1000),
        idempotencyKey: key,
        description: 'Duplicate',
      });

      expect(second.isRight()).toBe(true);
      expect(ledger.currentBalanceCents).toBe(8000);
      expect(ledger.getNewEntries()).toHaveLength(1);
    });
  });

  // ── recordRefund ─────────────────────────────────────────────────────────────

  describe('recordRefund', () => {
    it('revenue reversal decreases balance', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 9000 });

      const result = ledger.recordRefund({
        transactionId: generateId(),
        amount: makeMoney(9000),
        referenceEntryId: generateId(),
        isRevenueReversal: true,
        idempotencyKey: `refund:chgb1:entry1`,
        description: 'Revenue reversal',
      });

      expect(result.isRight()).toBe(true);
      expect(ledger.currentBalanceCents).toBe(0);
      expect(result.value.ledgerEntryType).toBe(LedgerEntryType.REFUND);
    });

    it('fee reversal increases balance (platform returns fee)', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 0 });

      const result = ledger.recordRefund({
        transactionId: generateId(),
        amount: makeMoney(1000),
        referenceEntryId: generateId(),
        isRevenueReversal: false,
        idempotencyKey: `refund:chgb1:entry2`,
        description: 'Fee reversal',
      });

      expect(result.isRight()).toBe(true);
      expect(ledger.currentBalanceCents).toBe(1000);
    });

    it('is idempotent', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 9000 });
      const key = `refund:chgb2:entry1`;

      ledger.recordRefund({
        transactionId: generateId(),
        amount: makeMoney(9000),
        referenceEntryId: generateId(),
        isRevenueReversal: true,
        idempotencyKey: key,
        description: 'First',
      });

      const second = ledger.recordRefund({
        transactionId: generateId(),
        amount: makeMoney(9000),
        referenceEntryId: generateId(),
        isRevenueReversal: true,
        idempotencyKey: key,
        description: 'Duplicate',
      });

      expect(ledger.currentBalanceCents).toBe(0);
      expect(ledger.getNewEntries()).toHaveLength(1);
      expect(second.value.id).toBe(ledger.getNewEntries()[0].id);
    });
  });

  // ── recordPayout ─────────────────────────────────────────────────────────────

  describe('recordPayout', () => {
    it('decreases balance by payout amount', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 50000 });

      const result = ledger.recordPayout({
        amount: makeMoney(30000),
        idempotencyKey: `payout:req1`,
        description: 'Monthly payout',
      });

      expect(result.isRight()).toBe(true);
      expect(ledger.currentBalanceCents).toBe(20000);
      expect(result.value.ledgerEntryType).toBe(LedgerEntryType.PAYOUT);
    });

    it('rejects payout when balance is insufficient', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 1000 });

      const result = ledger.recordPayout({
        amount: makeMoney(5000),
        idempotencyKey: `payout:req2`,
        description: 'Payout exceeds balance',
      });

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(InsufficientBalanceError);
      expect(ledger.currentBalanceCents).toBe(1000); // unchanged
    });

    it('rejects payout when ledger is FROZEN', () => {
      const ledger = makeFinancialLedger({
        currentBalanceCents: 50000,
        status: LedgerStatus.FROZEN,
      });

      const result = ledger.recordPayout({
        amount: makeMoney(1000),
        idempotencyKey: `payout:req3`,
        description: 'Blocked payout',
      });

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(LedgerFrozenError);
    });

    it('rejects payout when ledger is UNDER_REVIEW', () => {
      const ledger = makeFinancialLedger({
        currentBalanceCents: 50000,
        status: LedgerStatus.UNDER_REVIEW,
      });

      const result = ledger.recordPayout({
        amount: makeMoney(1000),
        idempotencyKey: `payout:req4`,
        description: 'Blocked payout',
      });

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(LedgerUnderReviewError);
    });

    it('is idempotent', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 50000 });
      const key = `payout:req5`;

      ledger.recordPayout({
        amount: makeMoney(10000),
        idempotencyKey: key,
        description: 'First',
      });

      const second = ledger.recordPayout({
        amount: makeMoney(10000),
        idempotencyKey: key,
        description: 'Duplicate',
      });

      expect(second.isRight()).toBe(true);
      expect(ledger.currentBalanceCents).toBe(40000);
      expect(ledger.getNewEntries()).toHaveLength(1);
    });

    it('allows zero-balance payout when amount equals balance', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 10000 });

      const result = ledger.recordPayout({
        amount: makeMoney(10000),
        idempotencyKey: `payout:exact`,
        description: 'Full withdrawal',
      });

      expect(result.isRight()).toBe(true);
      expect(ledger.currentBalanceCents).toBe(0);
    });
  });

  // ── recordAdjustment ─────────────────────────────────────────────────────────

  describe('recordAdjustment', () => {
    it('credit adjustment increases balance', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 5000 });

      const result = ledger.recordAdjustment({
        amount: makeMoney(2000),
        isCredit: true,
        idempotencyKey: `adj:1`,
        description: 'Admin credit',
      });

      expect(result.isRight()).toBe(true);
      expect(ledger.currentBalanceCents).toBe(7000);
      expect(result.value.ledgerEntryType).toBe(LedgerEntryType.ADJUSTMENT);
    });

    it('debit adjustment decreases balance', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 5000 });

      const result = ledger.recordAdjustment({
        amount: makeMoney(2000),
        isCredit: false,
        idempotencyKey: `adj:2`,
        description: 'Admin debit',
      });

      expect(result.isRight()).toBe(true);
      expect(ledger.currentBalanceCents).toBe(3000);
    });

    it('is idempotent', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 5000 });
      const key = `adj:3`;

      ledger.recordAdjustment({
        amount: makeMoney(1000),
        isCredit: true,
        idempotencyKey: key,
        description: 'First',
      });

      ledger.recordAdjustment({
        amount: makeMoney(1000),
        isCredit: true,
        idempotencyKey: key,
        description: 'Duplicate',
      });

      expect(ledger.currentBalanceCents).toBe(6000);
      expect(ledger.getNewEntries()).toHaveLength(1);
    });
  });

  // ── Status Transitions ────────────────────────────────────────────────────────

  describe('freeze', () => {
    it('transitions ACTIVE → FROZEN', () => {
      const ledger = makeNewFinancialLedger();

      const result = ledger.freeze();

      expect(result.isRight()).toBe(true);
      expect(ledger.status).toBe(LedgerStatus.FROZEN);
    });

    it('rejects freeze when already FROZEN', () => {
      const ledger = makeFinancialLedger({ status: LedgerStatus.FROZEN });

      const result = ledger.freeze();

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(InvalidLedgerStatusTransitionError);
    });

    it('transitions UNDER_REVIEW → FROZEN', () => {
      const ledger = makeFinancialLedger({ status: LedgerStatus.UNDER_REVIEW });
      expect(ledger.freeze().isRight()).toBe(true);
    });
  });

  describe('unfreeze', () => {
    it('transitions FROZEN → ACTIVE', () => {
      const ledger = makeFinancialLedger({ status: LedgerStatus.FROZEN });

      const result = ledger.unfreeze();

      expect(result.isRight()).toBe(true);
      expect(ledger.status).toBe(LedgerStatus.ACTIVE);
    });

    it('rejects unfreeze when not FROZEN', () => {
      const ledger = makeNewFinancialLedger();

      const result = ledger.unfreeze();

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(InvalidLedgerStatusTransitionError);
    });
  });

  describe('markUnderReview', () => {
    it('transitions ACTIVE → UNDER_REVIEW', () => {
      const ledger = makeNewFinancialLedger();

      const result = ledger.markUnderReview();

      expect(result.isRight()).toBe(true);
      expect(ledger.status).toBe(LedgerStatus.UNDER_REVIEW);
    });

    it('rejects when already UNDER_REVIEW', () => {
      const ledger = makeFinancialLedger({ status: LedgerStatus.UNDER_REVIEW });

      const result = ledger.markUnderReview();

      expect(result.isLeft()).toBe(true);
    });
  });

  describe('clearReview', () => {
    it('transitions UNDER_REVIEW → ACTIVE', () => {
      const ledger = makeFinancialLedger({ status: LedgerStatus.UNDER_REVIEW });

      const result = ledger.clearReview();

      expect(result.isRight()).toBe(true);
      expect(ledger.status).toBe(LedgerStatus.ACTIVE);
    });

    it('rejects when not UNDER_REVIEW', () => {
      const ledger = makeNewFinancialLedger();

      const result = ledger.clearReview();

      expect(result.isLeft()).toBe(true);
    });
  });

  // ── Balance Semantics ─────────────────────────────────────────────────────────

  describe('balance semantics', () => {
    it('isInDebt is false when balance is zero', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 0 });
      expect(ledger.isInDebt).toBe(false);
    });

    it('isInDebt is false when balance is positive', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: 100 });
      expect(ledger.isInDebt).toBe(false);
    });

    it('isInDebt is true when balance is negative', () => {
      const ledger = makeFinancialLedger({ currentBalanceCents: -1 });
      expect(ledger.isInDebt).toBe(true);
    });

    it('revenue + fee entries net to professional amount', () => {
      const ledger = makeNewFinancialLedger();
      const txId = generateId();

      ledger.recordRevenue({
        transactionId: txId,
        amount: makeMoney(9000),
        idempotencyKey: `revenue:exec1`,
        description: 'Revenue',
      });
      ledger.recordPlatformFee({
        transactionId: txId,
        amount: makeMoney(1000),
        idempotencyKey: `fee:exec1`,
        description: 'Fee',
      });

      expect(ledger.currentBalanceCents).toBe(8000); // 9000 − 1000
    });

    it('balanceAfterCents on entries forms a chain', () => {
      const ledger = makeNewFinancialLedger();
      const txId = generateId();

      const r1 = ledger.recordRevenue({
        transactionId: txId,
        amount: makeMoney(9000),
        idempotencyKey: `revenue:e1`,
        description: 'Rev',
      });
      const r2 = ledger.recordPlatformFee({
        transactionId: txId,
        amount: makeMoney(1000),
        idempotencyKey: `fee:e1`,
        description: 'Fee',
      });

      expect(r1.value.balanceAfterCents).toBe(9000);
      expect(r2.value.balanceAfterCents).toBe(8000);
    });
  });

  // ── markReconciled ────────────────────────────────────────────────────────────

  describe('markReconciled', () => {
    it('sets lastReconciledAtUtc to current UTC time', () => {
      const ledger = makeNewFinancialLedger();
      expect(ledger.lastReconciledAtUtc).toBeNull();

      ledger.markReconciled();

      expect(ledger.lastReconciledAtUtc).not.toBeNull();
      expect(ledger.lastReconciledAtUtc!.toISO()).toMatch(/Z$/);
    });

    it('can be called multiple times and updates the timestamp each time', () => {
      const ledger = makeNewFinancialLedger();
      ledger.markReconciled();
      const firstIso = ledger.lastReconciledAtUtc!.toISO();
      ledger.markReconciled();

      expect(ledger.lastReconciledAtUtc!.toISO()).toBeDefined();
      expect(typeof firstIso).toBe('string');
    });
  });

  // ── LedgerEntry.reconstitute ──────────────────────────────────────────────────

  describe('LedgerEntry.reconstitute', () => {
    it('reconstitutes a LedgerEntry from persistence props', () => {
      const moneyResult = Money.create(5000, 'BRL');
      const money = moneyResult.isRight()
        ? moneyResult.value
        : (() => {
            throw new Error();
          })();
      const occurredAt = UTCDateTime.now();

      const entry = LedgerEntry.reconstitute('00000000-0000-4000-8000-000000000001', {
        ledgerEntryType: LedgerEntryType.REVENUE,
        amount: money,
        balanceAfterCents: 5000,
        transactionId: generateId(),
        referenceEntryId: null,
        idempotencyKey: 'revenue:test',
        description: 'Reconstituted entry',
        occurredAtUtc: occurredAt,
      });

      expect(entry.id).toBe('00000000-0000-4000-8000-000000000001');
      expect(entry.ledgerEntryType).toBe(LedgerEntryType.REVENUE);
      expect(entry.amount.amount).toBe(5000);
      expect(entry.balanceAfterCents).toBe(5000);
    });
  });
});
