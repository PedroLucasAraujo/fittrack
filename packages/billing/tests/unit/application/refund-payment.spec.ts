import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { RefundPayment } from '../../../application/use-cases/refund-payment.js';
import { InMemoryTransactionRepository } from '../../repositories/in-memory-transaction-repository.js';
import { makeTransaction } from '../../factories/make-transaction.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.js';
import { BillingErrorCodes } from '../../../domain/errors/billing-error-codes.js';
import { ErrorCodes } from '@fittrack/core';

describe('RefundPayment', () => {
  let transactionRepository: InMemoryTransactionRepository;
  let sut: RefundPayment;
  let professionalProfileId: string;

  beforeEach(() => {
    transactionRepository = new InMemoryTransactionRepository();
    sut = new RefundPayment(transactionRepository);
    professionalProfileId = generateId();
  });

  it('refunds a CONFIRMED transaction and returns REFUNDED status (ADR-0020 PERIOD_PRESERVE)', async () => {
    const tx = makeTransaction({
      professionalProfileId,
      status: TransactionStatus.CONFIRMED,
    });
    transactionRepository.items.push(tx);

    const result = await sut.execute({
      transactionId: tx.id,
      professionalProfileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.transactionId).toBe(tx.id);
      expect(result.value.transactionStatus).toBe(TransactionStatus.REFUNDED);
      expect(result.value.refundedAtUtc).toBeDefined();
    }
    expect(transactionRepository.items[0]!.status).toBe(TransactionStatus.REFUNDED);
  });

  it('returns NOT_FOUND when transaction does not exist', async () => {
    const result = await sut.execute({
      transactionId: generateId(),
      professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.TRANSACTION_NOT_FOUND);
    }
  });

  it('returns NOT_FOUND for cross-tenant transaction (tenant isolation — ADR-0025)', async () => {
    const tx = makeTransaction({
      professionalProfileId: generateId(), // different tenant
      status: TransactionStatus.CONFIRMED,
    });
    transactionRepository.items.push(tx);

    const result = await sut.execute({
      transactionId: tx.id,
      professionalProfileId, // caller's tenant
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.TRANSACTION_NOT_FOUND);
    }
  });

  it('returns error when transaction is PENDING (not yet confirmed)', async () => {
    const tx = makeTransaction({
      professionalProfileId,
      status: TransactionStatus.PENDING,
    });
    transactionRepository.items.push(tx);

    const result = await sut.execute({
      transactionId: tx.id,
      professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.INVALID_TRANSACTION_TRANSITION);
    }
  });

  it('returns error when transaction is already REFUNDED', async () => {
    const tx = makeTransaction({
      professionalProfileId,
      status: TransactionStatus.REFUNDED,
    });
    transactionRepository.items.push(tx);

    const result = await sut.execute({
      transactionId: tx.id,
      professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.INVALID_TRANSACTION_TRANSITION);
    }
  });

  it('returns error when transaction is CHARGEBACK (terminal)', async () => {
    const tx = makeTransaction({
      professionalProfileId,
      status: TransactionStatus.CHARGEBACK,
    });
    transactionRepository.items.push(tx);

    const result = await sut.execute({
      transactionId: tx.id,
      professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.INVALID_TRANSACTION_TRANSITION);
    }
  });

  it('returns error for invalid transactionId UUID', async () => {
    const result = await sut.execute({
      transactionId: 'not-a-uuid',
      professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ErrorCodes.INVALID_UUID);
    }
  });
});
