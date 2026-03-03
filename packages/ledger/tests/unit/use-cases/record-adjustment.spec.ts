import { generateId } from '@fittrack/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecordAdjustment } from '../../../application/use-cases/record-adjustment.js';
import { LedgerEntryType } from '../../../domain/enums/ledger-entry-type.js';
import { LedgerNotFoundError } from '../../../domain/errors/ledger-not-found-error.js';
import { makeFinancialLedger } from '../../factories/make-financial-ledger.js';
import { InMemoryFinancialLedgerRepository } from '../../repositories/in-memory-financial-ledger-repository.js';
import { LedgerEventPublisherStub } from '../../stubs/ledger-event-publisher-stub.js';

const makeDto = (
  professionalProfileId: string,
  overrides: Partial<{
    adjustmentId: string;
    amountCents: number;
    currency: string;
    isCredit: boolean;
    description: string;
  }> = {},
) => ({
  professionalProfileId,
  adjustmentId: overrides.adjustmentId ?? generateId(),
  amountCents: overrides.amountCents ?? 5000,
  currency: overrides.currency ?? 'BRL',
  isCredit: overrides.isCredit ?? true,
  description: overrides.description ?? 'Administrative correction',
});

describe('RecordAdjustment', () => {
  let repository: InMemoryFinancialLedgerRepository;
  let eventPublisher: LedgerEventPublisherStub;
  let useCase: RecordAdjustment;

  beforeEach(() => {
    repository = new InMemoryFinancialLedgerRepository();
    eventPublisher = new LedgerEventPublisherStub();
    useCase = new RecordAdjustment(repository, eventPublisher);
  });

  it('returns Left with LedgerNotFoundError when ledger does not exist', async () => {
    const dto = makeDto(generateId());

    const result = await useCase.execute(dto);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(LedgerNotFoundError);
  });

  it('records a credit adjustment and increases the balance', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId, currentBalanceCents: 1000 });
    await repository.save(ledger);

    const dto = makeDto(professionalProfileId, { amountCents: 5000, isCredit: true });

    const result = await useCase.execute(dto);

    expect(result.isRight()).toBe(true);
    expect(result.value.currentBalanceCents).toBe(6000); // 1000 + 5000
    expect(result.value.isInDebt).toBe(false);
  });

  it('records a debit adjustment and decreases the balance', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId, currentBalanceCents: 10000 });
    await repository.save(ledger);

    const dto = makeDto(professionalProfileId, { amountCents: 3000, isCredit: false });

    const result = await useCase.execute(dto);

    expect(result.isRight()).toBe(true);
    expect(result.value.currentBalanceCents).toBe(7000); // 10000 - 3000
  });

  it('signals isInDebt when debit adjustment pushes balance negative', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId, currentBalanceCents: 0 });
    await repository.save(ledger);

    const dto = makeDto(professionalProfileId, { amountCents: 2000, isCredit: false });

    const result = await useCase.execute(dto);

    expect(result.isRight()).toBe(true);
    expect(result.value.currentBalanceCents).toBe(-2000);
    expect(result.value.isInDebt).toBe(true);
  });

  it('is idempotent: same adjustmentId returns same entry', async () => {
    const professionalProfileId = generateId();
    const adjustmentId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId, currentBalanceCents: 1000 });
    await repository.save(ledger);

    const dto = makeDto(professionalProfileId, { adjustmentId });

    const first = await useCase.execute(dto);
    const second = await useCase.execute(dto);

    expect(first.isRight()).toBe(true);
    expect(second.isRight()).toBe(true);
    expect(second.value.entryId).toBe(first.value.entryId);
    expect(second.value.currentBalanceCents).toBe(first.value.currentBalanceCents);
  });

  it('publishes LedgerBalanceChanged event with ADJUSTMENT entryType', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId });
    await repository.save(ledger);

    await useCase.execute(makeDto(professionalProfileId));

    const events = eventPublisher.getEventsByType('LedgerBalanceChanged');
    expect(events).toHaveLength(1);
    expect(events[0].payload.entryType).toBe(LedgerEntryType.ADJUSTMENT);
  });

  it('returns Left for invalid currency', async () => {
    const professionalProfileId = generateId();
    const dto = makeDto(professionalProfileId, { currency: 'bad' });

    const result = await useCase.execute(dto);

    expect(result.isLeft()).toBe(true);
  });
});
