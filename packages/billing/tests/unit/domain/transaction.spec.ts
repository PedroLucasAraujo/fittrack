import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { TransactionStatus } from '../../../domain/enums/transaction-status.js';
import { BillingErrorCodes } from '../../../domain/errors/billing-error-codes.js';
import { TransactionNotConfirmedError } from '../../../domain/errors/transaction-not-confirmed-error.js';
import { makeTransaction, makeNewTransaction } from '../../factories/make-transaction.js';

describe('Transaction', () => {
  // ── Creation ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates with PENDING status', () => {
      const tx = makeNewTransaction();

      expect(tx.status).toBe(TransactionStatus.PENDING);
      expect(tx.confirmedAtUtc).toBeNull();
      expect(tx.failedAtUtc).toBeNull();
      expect(tx.chargebackAtUtc).toBeNull();
      expect(tx.refundedAtUtc).toBeNull();
      expect(tx.gatewayTransactionId).toBeNull();
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const tx = makeNewTransaction();
      expect(tx.getDomainEvents()).toHaveLength(0);
    });

    it('uses provided id when given', () => {
      const id = generateId();
      const tx = makeNewTransaction({ id });
      expect(tx.id).toBe(id);
    });
  });

  describe('reconstitute()', () => {
    it('does not emit events', () => {
      const tx = makeTransaction();
      expect(tx.getDomainEvents()).toHaveLength(0);
    });

    it('preserves version', () => {
      const tx = makeTransaction({ version: 3 });
      expect(tx.version).toBe(3);
    });
  });

  // ── Confirm (ADR-0019 §5) ──────────────────────────────────────────────

  describe('confirm()', () => {
    it('transitions PENDING → CONFIRMED', () => {
      const tx = makeTransaction({ status: TransactionStatus.PENDING });

      const result = tx.confirm('gateway-123');

      expect(result.isRight()).toBe(true);
      expect(tx.status).toBe(TransactionStatus.CONFIRMED);
      expect(tx.confirmedAtUtc).not.toBeNull();
      expect(tx.gatewayTransactionId).toBe('gateway-123');
    });

    it('does not emit domain events', () => {
      const tx = makeTransaction({ status: TransactionStatus.PENDING });
      tx.confirm('gateway-123');
      expect(tx.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from CONFIRMED (no double confirm)', () => {
      const tx = makeTransaction({ status: TransactionStatus.CONFIRMED });

      const result = tx.confirm('gateway-456');

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(BillingErrorCodes.INVALID_TRANSACTION_TRANSITION);
      }
    });

    it('rejects from FAILED', () => {
      const tx = makeTransaction({ status: TransactionStatus.FAILED });
      expect(tx.confirm('gateway-789').isLeft()).toBe(true);
    });

    it('rejects from CHARGEBACK', () => {
      const tx = makeTransaction({ status: TransactionStatus.CHARGEBACK });
      expect(tx.confirm('gateway-abc').isLeft()).toBe(true);
    });

    it('rejects from REFUNDED', () => {
      const tx = makeTransaction({ status: TransactionStatus.REFUNDED });
      expect(tx.confirm('gateway-def').isLeft()).toBe(true);
    });
  });

  // ── Fail (ADR-0019 §5) ────────────────────────────────────────────────

  describe('fail()', () => {
    it('transitions PENDING → FAILED', () => {
      const tx = makeTransaction({ status: TransactionStatus.PENDING });

      const result = tx.fail();

      expect(result.isRight()).toBe(true);
      expect(tx.status).toBe(TransactionStatus.FAILED);
      expect(tx.failedAtUtc).not.toBeNull();
    });

    it('does not emit domain events', () => {
      const tx = makeTransaction({ status: TransactionStatus.PENDING });
      tx.fail();
      expect(tx.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from CONFIRMED', () => {
      const tx = makeTransaction({ status: TransactionStatus.CONFIRMED });
      expect(tx.fail().isLeft()).toBe(true);
    });

    it('rejects from FAILED (already failed)', () => {
      const tx = makeTransaction({ status: TransactionStatus.FAILED });
      expect(tx.fail().isLeft()).toBe(true);
    });

    it('rejects from CHARGEBACK', () => {
      const tx = makeTransaction({ status: TransactionStatus.CHARGEBACK });
      expect(tx.fail().isLeft()).toBe(true);
    });
  });

  // ── RegisterChargeback (ADR-0019 §5, ADR-0020) ────────────────────────

  describe('registerChargeback()', () => {
    it('transitions CONFIRMED → CHARGEBACK', () => {
      const tx = makeTransaction({ status: TransactionStatus.CONFIRMED });

      const result = tx.registerChargeback();

      expect(result.isRight()).toBe(true);
      expect(tx.status).toBe(TransactionStatus.CHARGEBACK);
      expect(tx.chargebackAtUtc).not.toBeNull();
    });

    it('transitions REFUNDED → CHARGEBACK', () => {
      const tx = makeTransaction({ status: TransactionStatus.REFUNDED });

      const result = tx.registerChargeback();

      expect(result.isRight()).toBe(true);
      expect(tx.status).toBe(TransactionStatus.CHARGEBACK);
    });

    it('does not emit domain events', () => {
      const tx = makeTransaction({ status: TransactionStatus.CONFIRMED });
      tx.registerChargeback();
      expect(tx.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from PENDING', () => {
      const tx = makeTransaction({ status: TransactionStatus.PENDING });

      const result = tx.registerChargeback();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(BillingErrorCodes.INVALID_TRANSACTION_TRANSITION);
      }
    });

    it('rejects from FAILED', () => {
      const tx = makeTransaction({ status: TransactionStatus.FAILED });
      expect(tx.registerChargeback().isLeft()).toBe(true);
    });

    it('rejects from CHARGEBACK (already chargebacked)', () => {
      const tx = makeTransaction({ status: TransactionStatus.CHARGEBACK });
      expect(tx.registerChargeback().isLeft()).toBe(true);
    });
  });

  // ── Refund (ADR-0019 §5) ──────────────────────────────────────────────

  describe('refund()', () => {
    it('transitions CONFIRMED → REFUNDED', () => {
      const tx = makeTransaction({ status: TransactionStatus.CONFIRMED });

      const result = tx.refund();

      expect(result.isRight()).toBe(true);
      expect(tx.status).toBe(TransactionStatus.REFUNDED);
      expect(tx.refundedAtUtc).not.toBeNull();
    });

    it('does not emit domain events', () => {
      const tx = makeTransaction({ status: TransactionStatus.CONFIRMED });
      tx.refund();
      expect(tx.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from PENDING', () => {
      const tx = makeTransaction({ status: TransactionStatus.PENDING });
      expect(tx.refund().isLeft()).toBe(true);
    });

    it('rejects from FAILED', () => {
      const tx = makeTransaction({ status: TransactionStatus.FAILED });
      expect(tx.refund().isLeft()).toBe(true);
    });

    it('rejects from REFUNDED (already refunded)', () => {
      const tx = makeTransaction({ status: TransactionStatus.REFUNDED });
      expect(tx.refund().isLeft()).toBe(true);
    });

    it('rejects from CHARGEBACK', () => {
      const tx = makeTransaction({ status: TransactionStatus.CHARGEBACK });
      expect(tx.refund().isLeft()).toBe(true);
    });
  });

  // ── Error classes ──────────────────────────────────────────────────────────

  describe('TransactionNotConfirmedError', () => {
    it('carries correct code and metadata', () => {
      const error = new TransactionNotConfirmedError('tx-123', 'PENDING');

      expect(error.code).toBe(BillingErrorCodes.TRANSACTION_NOT_CONFIRMED);
      expect(error.message).toContain('tx-123');
      expect(error.message).toContain('PENDING');
    });
  });

  // ── Getters ────────────────────────────────────────────────────────────────

  describe('getters', () => {
    it('exposes all fields via getters', () => {
      const clientId = generateId();
      const profileId = generateId();
      const planId = generateId();
      const tx = makeTransaction({
        clientId,
        professionalProfileId: profileId,
        servicePlanId: planId,
      });

      expect(tx.clientId).toBe(clientId);
      expect(tx.professionalProfileId).toBe(profileId);
      expect(tx.servicePlanId).toBe(planId);
      expect(tx.amount).toBeDefined();
      expect(tx.platformFee).toBeDefined();
      expect(tx.createdAtUtc).toBeDefined();
    });
  });
});
