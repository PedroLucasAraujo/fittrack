import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import type { ExecutionRecordedPayload } from '../../../application/ports/execution-recorded-payload.js';
import { ProjectExecutionToSelfLog } from '../../../application/use-cases/project-execution-to-self-log.js';
import { EntrySourceType } from '../../../domain/enums/entry-source-type.js';
import { SelfLogErrorCodes } from '../../../domain/errors/self-log-error-codes.js';
import { InMemorySelfLogEntryRepositoryStub } from '../../stubs/in-memory-self-log-entry-repository-stub.js';
import { InMemorySelfLogEventPublisherStub } from '../../stubs/in-memory-self-log-event-publisher-stub.js';

// ── Helper ────────────────────────────────────────────────────────────────────

function makeExecutionRecordedPayload(overrides?: {
  executionId?: string;
  clientId?: string;
  professionalProfileId?: string;
  deliverableId?: string;
  logicalDay?: string;
  occurredAtUtc?: string;
  timezoneUsed?: string;
}): ExecutionRecordedPayload {
  return {
    executionId: overrides?.executionId ?? generateId(),
    clientId: overrides?.clientId ?? generateId(),
    professionalProfileId: overrides?.professionalProfileId ?? generateId(),
    deliverableId: overrides?.deliverableId ?? generateId(),
    logicalDay: overrides?.logicalDay ?? '2026-02-22',
    status: 'CONFIRMED',
    occurredAtUtc: overrides?.occurredAtUtc ?? '2026-02-22T10:00:00.000Z',
    timezoneUsed: overrides?.timezoneUsed ?? 'America/Sao_Paulo',
  };
}

// ── ProjectExecutionToSelfLog ─────────────────────────────────────────────────

describe('ProjectExecutionToSelfLog', () => {
  let repo: InMemorySelfLogEntryRepositoryStub;
  let eventPublisher: InMemorySelfLogEventPublisherStub;
  let sut: ProjectExecutionToSelfLog;

  beforeEach(() => {
    repo = new InMemorySelfLogEntryRepositoryStub();
    eventPublisher = new InMemorySelfLogEventPublisherStub();
    sut = new ProjectExecutionToSelfLog(repo, eventPublisher);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('creates a source=EXECUTION SelfLogEntry from the payload', async () => {
    const executionId = generateId();
    const clientId = generateId();
    const professionalProfileId = generateId();
    const deliverableId = generateId();

    const dto = makeExecutionRecordedPayload({
      executionId,
      clientId,
      professionalProfileId,
      deliverableId,
    });

    const result = await sut.execute(dto);

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(1);

    const entry = repo.items[0]!;
    expect(entry.source.sourceType).toBe(EntrySourceType.EXECUTION);
    expect(entry.source.sourceId).toBe(executionId);
    expect(entry.clientId).toBe(clientId);
    expect(entry.professionalProfileId).toBe(professionalProfileId);
    expect(entry.deliverableId).toBe(deliverableId);
    expect(entry.logicalDay.value).toBe('2026-02-22');
    expect(entry.timezoneUsed).toBe('America/Sao_Paulo');
  });

  it('publishes SelfLogRecorded event post-save with source=EXECUTION payload', async () => {
    const executionId = generateId();
    const professionalProfileId = generateId();

    const dto = makeExecutionRecordedPayload({ executionId, professionalProfileId });
    await sut.execute(dto);

    expect(eventPublisher.publishedSelfLogRecorded).toHaveLength(1);
    const emitted = eventPublisher.publishedSelfLogRecorded[0]!;
    expect(emitted.eventType).toBe('SelfLogRecorded');
    expect(emitted.payload.sourceType).toBe(EntrySourceType.EXECUTION);
    expect(emitted.payload.sourceId).toBe(executionId);
    expect(emitted.payload.correctedEntryId).toBeNull();
  });

  // ── Idempotency guard (ADR-0007) ────────────────────────────────────────────

  it('returns Right<void> without creating a duplicate if the projection already exists', async () => {
    const executionId = generateId();
    const professionalProfileId = generateId();
    const dto = makeExecutionRecordedPayload({ executionId, professionalProfileId });

    // First projection
    await sut.execute(dto);
    expect(repo.items).toHaveLength(1);

    // Second call with the same payload (at-least-once delivery simulation — ADR-0016)
    const result = await sut.execute(dto);

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(1); // No duplicate
    expect(eventPublisher.publishedSelfLogRecorded).toHaveLength(1); // No duplicate event
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  it('returns Left for an invalid occurredAtUtc in the payload', async () => {
    const dto = makeExecutionRecordedPayload({ occurredAtUtc: 'bad-date' });

    const result = await sut.execute(dto);

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_ENTRY);
    }
  });

  it('returns Left for an invalid logicalDay in the payload', async () => {
    const dto = makeExecutionRecordedPayload({ logicalDay: 'not-a-date' });

    const result = await sut.execute(dto);

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_ENTRY);
    }
  });

  it('returns Left<InvalidSelfLogSourceError> when the executionId is not a valid UUID (EntrySource.execution fails)', async () => {
    const dto = makeExecutionRecordedPayload({ executionId: 'not-a-uuid' });

    const result = await sut.execute(dto);

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_SOURCE);
    }
  });

  // ── Tenant isolation (ADR-0025) ────────────────────────────────────────────────

  it('findById returns null for a different tenant (cross-tenant isolation — ADR-0025)', async () => {
    const tenantA = generateId();
    const tenantB = generateId();
    const dto = makeExecutionRecordedPayload({ professionalProfileId: tenantA });

    await sut.execute(dto);

    expect(repo.items).toHaveLength(1);
    const entryId = repo.items[0]!.id;

    const crossTenantResult = await repo.findById(entryId, tenantB);
    expect(crossTenantResult).toBeNull();
  });
});
