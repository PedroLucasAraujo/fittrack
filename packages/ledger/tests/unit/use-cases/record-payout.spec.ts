import { generateId } from '@fittrack/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecordPayout } from '../../../application/use-cases/record-payout.js';
import { LedgerStatus } from '../../../domain/enums/ledger-status.js';
import { InsufficientBalanceError } from '../../../domain/errors/insufficient-balance-error.js';
import { LedgerFrozenError } from '../../../domain/errors/ledger-frozen-error.js';
import { LedgerNotFoundError } from '../../../domain/errors/ledger-not-found-error.js';
import { LedgerUnderReviewError } from '../../../domain/errors/ledger-under-review-error.js';
import { makeFinancialLedger } from '../../factories/make-financial-ledger.js';
import { InMemoryFinancialLedgerRepository } from '../../repositories/in-memory-financial-ledger-repository.js';
import { LedgerEventPublisherStub } from '../../stubs/ledger-event-publisher-stub.js';

describe('RecordPayout', () => {
  let repository: InMemoryFinancialLedgerRepository;
  let eventPublisher: LedgerEventPublisherStub;
  let useCase: RecordPayout;

  beforeEach(() => {
    repository = new InMemoryFinancialLedgerRepository();
    eventPublisher = new LedgerEventPublisherStub();
    useCase = new RecordPayout(repository, eventPublisher);
  });

  it('returns Left with LedgerNotFoundError when ledger does not exist', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      payoutRequestId: generateId(),
      amountCents: 10000,
      currency: 'BRL',
      description: 'Payout',
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(LedgerNotFoundError);
  });

  it('records payout and returns updated balance', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId, currentBalanceCents: 50000 });
    await repository.save(ledger);

    const result = await useCase.execute({
      professionalProfileId,
      payoutRequestId: generateId(),
      amountCents: 30000,
      currency: 'BRL',
      description: 'Monthly payout',
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.currentBalanceCents).toBe(20000);
  });

  it('returns Left with InsufficientBalanceError when balance is insufficient', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId, currentBalanceCents: 5000 });
    await repository.save(ledger);

    const result = await useCase.execute({
      professionalProfileId,
      payoutRequestId: generateId(),
      amountCents: 10000,
      currency: 'BRL',
      description: 'Overdraft attempt',
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InsufficientBalanceError);
  });

  it('returns Left with LedgerFrozenError when ledger is FROZEN', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({
      professionalProfileId,
      currentBalanceCents: 50000,
      status: LedgerStatus.FROZEN,
    });
    await repository.save(ledger);

    const result = await useCase.execute({
      professionalProfileId,
      payoutRequestId: generateId(),
      amountCents: 1000,
      currency: 'BRL',
      description: 'Frozen payout',
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(LedgerFrozenError);
  });

  it('returns Left with LedgerUnderReviewError when ledger is UNDER_REVIEW', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({
      professionalProfileId,
      currentBalanceCents: 50000,
      status: LedgerStatus.UNDER_REVIEW,
    });
    await repository.save(ledger);

    const result = await useCase.execute({
      professionalProfileId,
      payoutRequestId: generateId(),
      amountCents: 1000,
      currency: 'BRL',
      description: 'Review blocked',
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(LedgerUnderReviewError);
  });

  it('publishes PayoutCompleted and LedgerBalanceChanged events', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId, currentBalanceCents: 50000 });
    await repository.save(ledger);

    await useCase.execute({
      professionalProfileId,
      payoutRequestId: generateId(),
      amountCents: 20000,
      currency: 'BRL',
      description: 'Payout',
    });

    const payoutEvents = eventPublisher.getEventsByType('PayoutCompleted');
    const balanceEvents = eventPublisher.getEventsByType('LedgerBalanceChanged');

    expect(payoutEvents).toHaveLength(1);
    expect(balanceEvents).toHaveLength(1);
    expect(payoutEvents[0].payload.amountCents).toBe(20000);
    expect(balanceEvents[0].payload.newBalanceCents).toBe(30000);
  });

  it('is idempotent with same payoutRequestId', async () => {
    const professionalProfileId = generateId();
    const payoutRequestId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId, currentBalanceCents: 50000 });
    await repository.save(ledger);

    const first = await useCase.execute({
      professionalProfileId,
      payoutRequestId,
      amountCents: 10000,
      currency: 'BRL',
      description: 'First',
    });

    const second = await useCase.execute({
      professionalProfileId,
      payoutRequestId,
      amountCents: 10000,
      currency: 'BRL',
      description: 'Duplicate',
    });

    expect(first.isRight()).toBe(true);
    expect(second.isRight()).toBe(true);
    expect(second.value.entryId).toBe(first.value.entryId);
    expect(second.value.currentBalanceCents).toBe(40000);
  });

  it('returns Left for invalid currency in amount', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      payoutRequestId: generateId(),
      amountCents: 1000,
      currency: 'invalid',
      description: 'Invalid currency',
    });

    expect(result.isLeft()).toBe(true);
  });
});
