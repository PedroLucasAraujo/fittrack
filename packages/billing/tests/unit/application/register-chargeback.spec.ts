import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { RegisterChargeback } from '../../../application/use-cases/register-chargeback.js';
import { InMemoryTransactionRepository } from '../../repositories/in-memory-transaction-repository.js';
import { InMemoryAccessGrantRepository } from '../../repositories/in-memory-access-grant-repository.js';
import { makeTransaction } from '../../factories/make-transaction.js';
import { makeAccessGrant } from '../../factories/make-access-grant.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.js';
import { AccessGrantStatus } from '../../../domain/enums/access-grant-status.js';
import { BillingErrorCodes } from '../../../domain/errors/billing-error-codes.js';

describe('RegisterChargeback', () => {
  let transactionRepository: InMemoryTransactionRepository;
  let accessGrantRepository: InMemoryAccessGrantRepository;
  let sut: RegisterChargeback;

  beforeEach(() => {
    transactionRepository = new InMemoryTransactionRepository();
    accessGrantRepository = new InMemoryAccessGrantRepository();
    sut = new RegisterChargeback(transactionRepository, accessGrantRepository);
  });

  it('registers chargeback and revokes access grant', async () => {
    const tx = makeTransaction({ status: TransactionStatus.CONFIRMED });
    transactionRepository.items.push(tx);

    const grant = makeAccessGrant({
      transactionId: tx.id,
      status: AccessGrantStatus.ACTIVE,
    });
    accessGrantRepository.items.push(grant);

    const result = await sut.execute({ transactionId: tx.id });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.transactionStatus).toBe(TransactionStatus.CHARGEBACK);
      expect(output.accessGrantStatus).toBe(AccessGrantStatus.REVOKED);
      expect(output.revokedAtUtc).toBeDefined();
    }
  });

  it('revokes access grant with reason CHARGEBACK', async () => {
    const tx = makeTransaction({ status: TransactionStatus.CONFIRMED });
    transactionRepository.items.push(tx);

    const grant = makeAccessGrant({
      transactionId: tx.id,
      status: AccessGrantStatus.ACTIVE,
    });
    accessGrantRepository.items.push(grant);

    await sut.execute({ transactionId: tx.id });

    expect(grant.revokedReason).toBe('CHARGEBACK');
  });

  it('returns error if transaction not found', async () => {
    const result = await sut.execute({ transactionId: generateId() });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.TRANSACTION_NOT_FOUND);
    }
  });

  it('returns error if transaction is not CONFIRMED', async () => {
    const tx = makeTransaction({ status: TransactionStatus.PENDING });
    transactionRepository.items.push(tx);

    const result = await sut.execute({ transactionId: tx.id });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(
        BillingErrorCodes.INVALID_TRANSACTION_TRANSITION,
      );
    }
  });

  it('returns error if access grant not found', async () => {
    const tx = makeTransaction({ status: TransactionStatus.CONFIRMED });
    transactionRepository.items.push(tx);

    const result = await sut.execute({ transactionId: tx.id });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.ACCESS_GRANT_NOT_FOUND);
    }
  });

  it('returns error if transactionId is not a valid UUID', async () => {
    const result = await sut.execute({ transactionId: 'not-a-uuid' });
    expect(result.isLeft()).toBe(true);
  });
});
