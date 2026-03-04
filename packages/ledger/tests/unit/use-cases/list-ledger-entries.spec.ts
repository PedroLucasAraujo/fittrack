import { Money, generateId } from '@fittrack/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ListLedgerEntries } from '../../../application/use-cases/list-ledger-entries.js';
import { LedgerEntryType } from '../../../domain/enums/ledger-entry-type.js';
import { LedgerNotFoundError } from '../../../domain/errors/ledger-not-found-error.js';
import { makeFinancialLedger } from '../../factories/make-financial-ledger.js';
import { InMemoryFinancialLedgerRepository } from '../../repositories/in-memory-financial-ledger-repository.js';

const makeMoney = (cents: number, currency = 'BRL') => {
  const r = Money.create(cents, currency);
  if (r.isLeft()) throw new Error(r.value.message);
  return r.value;
};

describe('ListLedgerEntries', () => {
  let repository: InMemoryFinancialLedgerRepository;
  let useCase: ListLedgerEntries;

  beforeEach(() => {
    repository = new InMemoryFinancialLedgerRepository();
    useCase = new ListLedgerEntries(repository);
  });

  it('returns Left with LedgerNotFoundError when ledger does not exist', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      page: { page: 1, limit: 10 },
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(LedgerNotFoundError);
  });

  it('returns empty list when ledger exists but has no entries', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId });
    await repository.save(ledger);

    const result = await useCase.execute({
      professionalProfileId,
      page: { page: 1, limit: 10 },
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected Right');
    expect(result.value.items).toHaveLength(0);
  });

  it('returns entries after they are recorded and saved', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId });

    ledger.recordRevenue({
      transactionId: generateId(),
      amount: makeMoney(9000),
      idempotencyKey: `revenue:exec1`,
      description: 'Session 1',
    });
    ledger.recordPlatformFee({
      transactionId: generateId(),
      amount: makeMoney(1000),
      idempotencyKey: `fee:exec1`,
      description: 'Fee 1',
    });

    await repository.save(ledger);

    const result = await useCase.execute({
      professionalProfileId,
      page: { page: 1, limit: 10 },
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected Right');
    expect(result.value.items).toHaveLength(2);
    const item0 = result.value.items[0];
    const item1 = result.value.items[1];
    if (!item0 || !item1) throw new Error('expected 2 items');
    expect(item0.ledgerEntryType).toBe(LedgerEntryType.REVENUE);
    expect(item1.ledgerEntryType).toBe(LedgerEntryType.PLATFORM_FEE);
  });

  it('filters by entryType when specified', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId });

    ledger.recordRevenue({
      transactionId: generateId(),
      amount: makeMoney(9000),
      idempotencyKey: `revenue:exec1`,
      description: 'Revenue',
    });
    ledger.recordPlatformFee({
      transactionId: generateId(),
      amount: makeMoney(1000),
      idempotencyKey: `fee:exec1`,
      description: 'Fee',
    });

    await repository.save(ledger);

    const result = await useCase.execute({
      professionalProfileId,
      page: { page: 1, limit: 10 },
      entryType: LedgerEntryType.REVENUE,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected Right');
    expect(result.value.items).toHaveLength(1);
    const filteredItem0 = result.value.items[0];
    if (!filteredItem0) throw new Error('expected item');
    expect(filteredItem0.ledgerEntryType).toBe(LedgerEntryType.REVENUE);
    expect(filteredItem0.amountCents).toBe(9000);
  });

  it('maps entry fields correctly to DTO', async () => {
    const professionalProfileId = generateId();
    const transactionId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId });

    ledger.recordRevenue({
      transactionId,
      amount: makeMoney(5000),
      idempotencyKey: `revenue:e1`,
      description: 'Test entry',
    });

    await repository.save(ledger);

    const result = await useCase.execute({
      professionalProfileId,
      page: { page: 1, limit: 10 },
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected Right');
    const entry = result.value.items[0];
    if (!entry) throw new Error('expected entry');

    expect(entry.transactionId).toBe(transactionId);
    expect(entry.amountCents).toBe(5000);
    expect(entry.currency).toBe('BRL');
    expect(entry.description).toBe('Test entry');
    expect(entry.occurredAtUtc).toMatch(/Z$/);
    expect(entry.referenceEntryId).toBeNull();
  });
});
