import { generateId } from '@fittrack/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ClearLedgerReview } from '../../../application/use-cases/clear-ledger-review.js';
import { LedgerStatus } from '../../../domain/enums/ledger-status.js';
import { InvalidLedgerStatusTransitionError } from '../../../domain/errors/invalid-ledger-status-transition-error.js';
import { LedgerNotFoundError } from '../../../domain/errors/ledger-not-found-error.js';
import { makeFinancialLedger } from '../../factories/make-financial-ledger.js';
import { InMemoryFinancialLedgerRepository } from '../../repositories/in-memory-financial-ledger-repository.js';
import { LedgerEventPublisherStub } from '../../stubs/ledger-event-publisher-stub.js';

describe('ClearLedgerReview', () => {
  let repository: InMemoryFinancialLedgerRepository;
  let eventPublisher: LedgerEventPublisherStub;
  let useCase: ClearLedgerReview;

  beforeEach(() => {
    repository = new InMemoryFinancialLedgerRepository();
    eventPublisher = new LedgerEventPublisherStub();
    useCase = new ClearLedgerReview(repository, eventPublisher);
  });

  it('returns Left with LedgerNotFoundError when ledger does not exist', async () => {
    const result = await useCase.execute({ professionalProfileId: generateId(), reason: 'test' });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(LedgerNotFoundError);
  });

  it('transitions UNDER_REVIEW ledger to ACTIVE and returns statuses', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({
      professionalProfileId,
      status: LedgerStatus.UNDER_REVIEW,
    });
    await repository.save(ledger);

    const result = await useCase.execute({ professionalProfileId, reason: 'Issue resolved' });

    expect(result.isRight()).toBe(true);
    expect(result.value.previousStatus).toBe(LedgerStatus.UNDER_REVIEW);
    expect(result.value.newStatus).toBe(LedgerStatus.ACTIVE);
  });

  it('returns Left with InvalidLedgerStatusTransitionError when ledger is not UNDER_REVIEW', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({ professionalProfileId }); // ACTIVE
    await repository.save(ledger);

    const result = await useCase.execute({ professionalProfileId, reason: 'Clear active' });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidLedgerStatusTransitionError);
  });

  it('publishes LedgerStatusChanged event pós-save', async () => {
    const professionalProfileId = generateId();
    const ledger = makeFinancialLedger({
      professionalProfileId,
      status: LedgerStatus.UNDER_REVIEW,
    });
    await repository.save(ledger);

    await useCase.execute({ professionalProfileId, reason: 'Issue resolved' });

    const events = eventPublisher.getEventsByType('LedgerStatusChanged');
    expect(events).toHaveLength(1);
    expect(events[0].payload.newStatus).toBe(LedgerStatus.ACTIVE);
    expect(events[0].payload.previousStatus).toBe(LedgerStatus.UNDER_REVIEW);
    expect(events[0].payload.reason).toBe('Issue resolved');
  });
});
