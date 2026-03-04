import { generateId } from '@fittrack/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProcessChargeback } from '../../../application/use-cases/process-chargeback.js';
import { LedgerEntryType } from '../../../domain/enums/ledger-entry-type.js';
import { LedgerNotFoundError } from '../../../domain/errors/ledger-not-found-error.js';
import { LedgerBalanceChangedEvent } from '../../../domain/events/ledger-balance-changed-event.js';
import { RefundRecordedEvent } from '../../../domain/events/refund-recorded-event.js';
import { makeFinancialLedger } from '../../factories/make-financial-ledger.js';
import { InMemoryFinancialLedgerRepository } from '../../repositories/in-memory-financial-ledger-repository.js';
import { LedgerEventPublisherStub } from '../../stubs/ledger-event-publisher-stub.js';

const makeDto = (
  professionalProfileId: string,
  overrides: Partial<{
    chargebackId: string;
    transactionId: string;
    revenueEntryId: string;
    platformFeeEntryId: string;
    professionalAmountCents: number;
    platformFeeAmountCents: number;
    currency: string;
    reason: string;
  }> = {},
) => ({
  professionalProfileId,
  chargebackId: overrides.chargebackId ?? generateId(),
  transactionId: overrides.transactionId ?? generateId(),
  revenueEntryId: overrides.revenueEntryId ?? generateId(),
  platformFeeEntryId: overrides.platformFeeEntryId ?? generateId(),
  professionalAmountCents: overrides.professionalAmountCents ?? 9000,
  platformFeeAmountCents: overrides.platformFeeAmountCents ?? 1000,
  currency: overrides.currency ?? 'BRL',
  reason: overrides.reason ?? 'Customer dispute',
});

describe('ProcessChargeback', () => {
  let repository: InMemoryFinancialLedgerRepository;
  let eventPublisher: LedgerEventPublisherStub;
  let useCase: ProcessChargeback;

  beforeEach(() => {
    repository = new InMemoryFinancialLedgerRepository();
    eventPublisher = new LedgerEventPublisherStub();
    useCase = new ProcessChargeback(repository, eventPublisher);
  });

  it('returns Left with LedgerNotFoundError when ledger does not exist', async () => {
    const dto = makeDto(generateId());

    const result = await useCase.execute(dto);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(LedgerNotFoundError);
  });

  it('records revenue reversal and fee reversal entries', async () => {
    const professionalProfileId = generateId();
    // Net: revenue=9000 − fee=1000 → balance=8000
    const ledger = makeFinancialLedger({
      professionalProfileId,
      currentBalanceCents: 8000,
    });
    await repository.save(ledger);

    const dto = makeDto(professionalProfileId);

    const result = await useCase.execute(dto);

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected Right');
    const output = result.value;

    // Revenue reversal (−9000) + fee reversal (+1000) = net −8000
    expect(output.currentBalanceCents).toBe(0); // 8000 − 9000 + 1000
    expect(output.isInDebt).toBe(false);
  });

  it('signals isInDebt when chargeback pushes balance negative', async () => {
    const professionalProfileId = generateId();
    // Professional had 0 balance (e.g., already paid out)
    const ledger = makeFinancialLedger({
      professionalProfileId,
      currentBalanceCents: 0,
    });
    await repository.save(ledger);

    const dto = makeDto(professionalProfileId);

    const result = await useCase.execute(dto);

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected Right');
    // Revenue reversal −9000, fee reversal +1000 → net −8000
    expect(result.value.currentBalanceCents).toBe(-8000);
    expect(result.value.isInDebt).toBe(true);
  });

  it('publishes two RefundRecorded events and one LedgerBalanceChanged', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId, currentBalanceCents: 8000 });
    await repository.save(ledger);

    const dto = makeDto(professionalProfileId);

    await useCase.execute(dto);

    const refundEvents = eventPublisher.getEventsByType<RefundRecordedEvent>('RefundRecorded');
    const balanceEvents =
      eventPublisher.getEventsByType<LedgerBalanceChangedEvent>('LedgerBalanceChanged');

    expect(refundEvents).toHaveLength(2);
    expect(balanceEvents).toHaveLength(1);
    const balanceEv0 = balanceEvents[0];
    if (!balanceEv0) throw new Error('expected event');
    expect(balanceEv0.payload.entryType).toBe(LedgerEntryType.REFUND);
  });

  it('is idempotent: same chargebackId returns same entries', async () => {
    const professionalProfileId = generateId();
    const chargebackId = generateId();
    const revenueEntryId = generateId();
    const platformFeeEntryId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId, currentBalanceCents: 8000 });
    await repository.save(ledger);

    const dto = makeDto(professionalProfileId, {
      chargebackId,
      revenueEntryId,
      platformFeeEntryId,
    });

    const first = await useCase.execute(dto);
    const second = await useCase.execute(dto);

    expect(first.isRight()).toBe(true);
    expect(second.isRight()).toBe(true);
    if (!first.isRight() || !second.isRight()) throw new Error('expected Right');
    expect(second.value.revenueRefundEntryId).toBe(first.value.revenueRefundEntryId);
    expect(second.value.currentBalanceCents).toBe(first.value.currentBalanceCents);
  });

  it('returns Left when professional amount has invalid currency', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId });
    await repository.save(ledger);
    const dto = makeDto(professionalProfileId, { currency: 'bad' });

    const result = await useCase.execute(dto);

    expect(result.isLeft()).toBe(true);
  });

  it('sets referenceEntryId correctly for both refund entries', async () => {
    const professionalProfileId = generateId();
    const revenueEntryId = generateId();
    const platformFeeEntryId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId, currentBalanceCents: 8000 });
    await repository.save(ledger);

    const dto = makeDto(professionalProfileId, { revenueEntryId, platformFeeEntryId });

    const result = await useCase.execute(dto);

    expect(result.isRight()).toBe(true);
    const refundEvents = eventPublisher.getEventsByType<RefundRecordedEvent>('RefundRecorded');
    const refundEv0 = refundEvents[0];
    const refundEv1 = refundEvents[1];
    if (!refundEv0 || !refundEv1) throw new Error('expected 2 refund events');
    expect(refundEv0.payload.referenceEntryId).toBe(revenueEntryId);
    expect(refundEv1.payload.referenceEntryId).toBe(platformFeeEntryId);
  });
});
