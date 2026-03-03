import { generateId } from '@fittrack/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { GetLedgerBalance } from '../../../application/use-cases/get-ledger-balance.js';
import { LedgerStatus } from '../../../domain/enums/ledger-status.js';
import { LedgerNotFoundError } from '../../../domain/errors/ledger-not-found-error.js';
import { makeFinancialLedger } from '../../factories/make-financial-ledger.js';
import { InMemoryFinancialLedgerRepository } from '../../repositories/in-memory-financial-ledger-repository.js';

describe('GetLedgerBalance', () => {
  let repository: InMemoryFinancialLedgerRepository;
  let useCase: GetLedgerBalance;

  beforeEach(() => {
    repository = new InMemoryFinancialLedgerRepository();
    useCase = new GetLedgerBalance(repository);
  });

  it('returns Left with LedgerNotFoundError when ledger does not exist', async () => {
    const result = await useCase.execute({ professionalProfileId: generateId() });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(LedgerNotFoundError);
  });

  it('returns current balance and status', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({
      professionalProfileId,
      currentBalanceCents: 42000,
      currency: 'BRL',
      status: LedgerStatus.ACTIVE,
    });
    await repository.save(ledger);

    const result = await useCase.execute({ professionalProfileId });

    expect(result.isRight()).toBe(true);
    const output = result.value;

    expect(output.currentBalanceCents).toBe(42000);
    expect(output.currency).toBe('BRL');
    expect(output.status).toBe(LedgerStatus.ACTIVE);
    expect(output.isInDebt).toBe(false);
    expect(output.professionalProfileId).toBe(professionalProfileId);
  });

  it('returns isInDebt=true when balance is negative', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({
      professionalProfileId,
      currentBalanceCents: -5000,
    });
    await repository.save(ledger);

    const result = await useCase.execute({ professionalProfileId });

    expect(result.isRight()).toBe(true);
    expect(result.value.isInDebt).toBe(true);
    expect(result.value.currentBalanceCents).toBe(-5000);
  });

  it('returns null for lastReconciledAtUtc when never reconciled', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId });
    await repository.save(ledger);

    const result = await useCase.execute({ professionalProfileId });

    expect(result.isRight()).toBe(true);
    expect(result.value.lastReconciledAtUtc).toBeNull();
  });

  it('returns ISO string for lastReconciledAtUtc when reconciled', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId });
    ledger.markReconciled();
    await repository.save(ledger);

    const result = await useCase.execute({ professionalProfileId });

    expect(result.isRight()).toBe(true);
    expect(result.value.lastReconciledAtUtc).not.toBeNull();
    expect(result.value.lastReconciledAtUtc).toMatch(/Z$/);
  });
});
