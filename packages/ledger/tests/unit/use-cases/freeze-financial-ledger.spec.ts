import { generateId } from '@fittrack/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { FreezeFinancialLedger } from '../../../application/use-cases/freeze-financial-ledger.js';
import { LedgerStatus } from '../../../domain/enums/ledger-status.js';
import { LedgerStatusChangedEvent } from '../../../domain/events/ledger-status-changed-event.js';
import { InvalidLedgerStatusTransitionError } from '../../../domain/errors/invalid-ledger-status-transition-error.js';
import { LedgerNotFoundError } from '../../../domain/errors/ledger-not-found-error.js';
import { makeFinancialLedger } from '../../factories/make-financial-ledger.js';
import { InMemoryFinancialLedgerRepository } from '../../repositories/in-memory-financial-ledger-repository.js';
import { LedgerEventPublisherStub } from '../../stubs/ledger-event-publisher-stub.js';

describe('FreezeFinancialLedger', () => {
  let repository: InMemoryFinancialLedgerRepository;
  let eventPublisher: LedgerEventPublisherStub;
  let useCase: FreezeFinancialLedger;

  beforeEach(() => {
    repository = new InMemoryFinancialLedgerRepository();
    eventPublisher = new LedgerEventPublisherStub();
    useCase = new FreezeFinancialLedger(repository, eventPublisher);
  });

  it('returns Left with LedgerNotFoundError when ledger does not exist', async () => {
    const result = await useCase.execute({ professionalProfileId: generateId(), reason: 'test' });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(LedgerNotFoundError);
  });

  it('transitions ACTIVE ledger to FROZEN and returns previous and new status', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId });
    await repository.save(ledger);

    const result = await useCase.execute({ professionalProfileId, reason: 'Risk review' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('expected Right');
    expect(result.value.previousStatus).toBe(LedgerStatus.ACTIVE);
    expect(result.value.newStatus).toBe(LedgerStatus.FROZEN);
  });

  it('returns Left with InvalidLedgerStatusTransitionError when already FROZEN', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId, status: LedgerStatus.FROZEN });
    await repository.save(ledger);

    const result = await useCase.execute({ professionalProfileId, reason: 'Second freeze' });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidLedgerStatusTransitionError);
  });

  it('publishes LedgerStatusChanged event pós-save', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId });
    await repository.save(ledger);

    await useCase.execute({ professionalProfileId, reason: 'Admin action' });

    const events = eventPublisher.getEventsByType<LedgerStatusChangedEvent>('LedgerStatusChanged');
    expect(events).toHaveLength(1);
    const ev0 = events[0];
    if (!ev0) throw new Error('expected event');
    expect(ev0.payload.newStatus).toBe(LedgerStatus.FROZEN);
    expect(ev0.payload.previousStatus).toBe(LedgerStatus.ACTIVE);
    expect(ev0.payload.reason).toBe('Admin action');
  });
});
