import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ListExecutions } from '../../../application/use-cases/list-executions.js';
import { InMemoryExecutionRepository } from '../../repositories/in-memory-execution-repository.js';
import { makeExecution } from '../../factories/make-execution.js';

describe('ListExecutions', () => {
  let repository: InMemoryExecutionRepository;
  let sut: ListExecutions;

  beforeEach(() => {
    repository = new InMemoryExecutionRepository();
    sut = new ListExecutions(repository);
  });

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('returns a paginated list of Executions for the tenant', async () => {
    const profileId = generateId();
    const e1 = makeExecution({ professionalProfileId: profileId });
    const e2 = makeExecution({ professionalProfileId: profileId });
    await repository.save(e1);
    await repository.save(e2);

    const result = await sut.execute({
      professionalProfileId: profileId,
      page: 1,
      limit: 10,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.items).toHaveLength(2);
      expect(output.total).toBe(2);
      expect(output.page).toBe(1);
      expect(output.limit).toBe(10);
      expect(output.hasNextPage).toBe(false);
    }
  });

  it('maps each item to the correct output shape', async () => {
    const profileId = generateId();
    const execution = makeExecution({ professionalProfileId: profileId });
    execution.recordCorrection('Reason A', generateId());
    execution.recordCorrection('Reason B', generateId());
    await repository.save(execution);

    const result = await sut.execute({ professionalProfileId: profileId, page: 1, limit: 10 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const item = result.value.items[0]!;
      expect(item.executionId).toBe(execution.id);
      expect(item.clientId).toBe(execution.clientId);
      expect(item.deliverableId).toBe(execution.deliverableId);
      expect(item.logicalDay).toBe(execution.logicalDay.value);
      expect(item.timezoneUsed).toBe(execution.timezoneUsed);
      expect(item.occurredAtUtc).toBeDefined();
      expect(item.correctionCount).toBe(2);
    }
  });

  it('returns an empty list when the tenant has no Executions', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      page: 1,
      limit: 10,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(0);
      expect(result.value.total).toBe(0);
      expect(result.value.hasNextPage).toBe(false);
    }
  });

  it('excludes Executions from other tenants (ADR-0025)', async () => {
    const profileId = generateId();
    const otherProfileId = generateId();

    await repository.save(makeExecution({ professionalProfileId: profileId }));
    await repository.save(makeExecution({ professionalProfileId: otherProfileId }));

    const result = await sut.execute({ professionalProfileId: profileId, page: 1, limit: 10 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.total).toBe(1);
    }
  });

  // ── Pagination ─────────────────────────────────────────────────────────────

  it('returns the correct page slice and sets hasNextPage = true', async () => {
    const profileId = generateId();
    for (let i = 0; i < 5; i++) {
      await repository.save(makeExecution({ professionalProfileId: profileId }));
    }

    const result = await sut.execute({ professionalProfileId: profileId, page: 1, limit: 3 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(3);
      expect(result.value.total).toBe(5);
      expect(result.value.hasNextPage).toBe(true);
    }
  });

  it('returns the second page slice and sets hasNextPage = false', async () => {
    const profileId = generateId();
    for (let i = 0; i < 5; i++) {
      await repository.save(makeExecution({ professionalProfileId: profileId }));
    }

    const result = await sut.execute({ professionalProfileId: profileId, page: 2, limit: 3 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(2);
      expect(result.value.total).toBe(5);
      expect(result.value.hasNextPage).toBe(false);
    }
  });
});
