import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import type { ExecutionCorrectionRecordedPayload } from '../../../application/ports/execution-correction-recorded-payload.js';
import { HandleExecutionCorrectionProjection } from '../../../application/use-cases/handle-execution-correction-projection.js';
import { EntrySource } from '../../../domain/value-objects/entry-source.js';
import { EntrySourceType } from '../../../domain/enums/entry-source-type.js';
import { SelfLogErrorCodes } from '../../../domain/errors/self-log-error-codes.js';
import { InMemorySelfLogEntryRepositoryStub } from '../../stubs/in-memory-self-log-entry-repository-stub.js';
import { InMemorySelfLogEventPublisherStub } from '../../stubs/in-memory-self-log-event-publisher-stub.js';
import { makeSelfLogEntry } from '../../factories/make-self-log-entry.js';

// ── Helper ────────────────────────────────────────────────────────────────────

function makePayload(
  overrides?: Partial<ExecutionCorrectionRecordedPayload>,
): ExecutionCorrectionRecordedPayload {
  return {
    correctionId: overrides?.correctionId ?? generateId(),
    originalExecutionId: overrides?.originalExecutionId ?? generateId(),
    professionalProfileId: overrides?.professionalProfileId ?? generateId(),
  };
}

// ── HandleExecutionCorrectionProjection ───────────────────────────────────────

describe('HandleExecutionCorrectionProjection', () => {
  let repo: InMemorySelfLogEntryRepositoryStub;
  let eventPublisher: InMemorySelfLogEventPublisherStub;
  let sut: HandleExecutionCorrectionProjection;

  beforeEach(() => {
    repo = new InMemorySelfLogEntryRepositoryStub();
    eventPublisher = new InMemorySelfLogEventPublisherStub();
    sut = new HandleExecutionCorrectionProjection(repo, eventPublisher);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('creates a new correction SelfLogEntry with correctedEntryId pointing to the original', async () => {
    const professionalProfileId = generateId();
    const originalExecutionId = generateId();
    const correctionId = generateId();
    const clientId = generateId();
    const deliverableId = generateId();

    // Seed the original projection entry
    const sourceResult = EntrySource.execution(originalExecutionId);
    if (sourceResult.isLeft()) throw new Error('test setup: invalid originalExecutionId');
    const originalEntry = makeSelfLogEntry({
      clientId,
      professionalProfileId,
      source: sourceResult.value,
      deliverableId,
    });
    await repo.save(originalEntry);

    const dto = makePayload({ correctionId, originalExecutionId, professionalProfileId });
    const result = await sut.execute(dto);

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(2);

    const correctionEntry = repo.items[1]!;
    expect(correctionEntry.correctedEntryId).toBe(originalEntry.id);
  });

  it('new correction entry has source=EXECUTION with correctionId as sourceId', async () => {
    const professionalProfileId = generateId();
    const originalExecutionId = generateId();
    const correctionId = generateId();

    const sourceResult = EntrySource.execution(originalExecutionId);
    if (sourceResult.isLeft()) throw new Error('test setup: invalid originalExecutionId');
    const originalEntry = makeSelfLogEntry({ professionalProfileId, source: sourceResult.value });
    await repo.save(originalEntry);

    const dto = makePayload({ correctionId, originalExecutionId, professionalProfileId });
    await sut.execute(dto);

    const correctionEntry = repo.items[1]!;
    expect(correctionEntry.source.sourceType).toBe(EntrySourceType.EXECUTION);
    expect(correctionEntry.source.sourceId).toBe(correctionId);
  });

  it('copies temporal fields (occurredAtUtc, logicalDay, timezoneUsed) from the original entry', async () => {
    const professionalProfileId = generateId();
    const originalExecutionId = generateId();

    const logicalDayResult = LogicalDay.create('2026-03-01');
    if (logicalDayResult.isLeft()) throw new Error('test setup');
    const occurredAtUtc = UTCDateTime.now();

    const sourceResult = EntrySource.execution(originalExecutionId);
    if (sourceResult.isLeft()) throw new Error('test setup');
    const originalEntry = makeSelfLogEntry({
      professionalProfileId,
      source: sourceResult.value,
      occurredAtUtc,
      logicalDay: logicalDayResult.value,
      timezoneUsed: 'America/Sao_Paulo',
    });
    await repo.save(originalEntry);

    const dto = makePayload({ originalExecutionId, professionalProfileId });
    await sut.execute(dto);

    const correctionEntry = repo.items[1]!;
    expect(correctionEntry.occurredAtUtc.toISO()).toBe(originalEntry.occurredAtUtc.toISO());
    expect(correctionEntry.logicalDay.value).toBe('2026-03-01');
    expect(correctionEntry.timezoneUsed).toBe('America/Sao_Paulo');
  });

  it('copies clientId and deliverableId from the original entry', async () => {
    const professionalProfileId = generateId();
    const originalExecutionId = generateId();
    const clientId = generateId();
    const deliverableId = generateId();

    const sourceResult = EntrySource.execution(originalExecutionId);
    if (sourceResult.isLeft()) throw new Error('test setup');
    const originalEntry = makeSelfLogEntry({
      clientId,
      professionalProfileId,
      source: sourceResult.value,
      deliverableId,
    });
    await repo.save(originalEntry);

    const dto = makePayload({ originalExecutionId, professionalProfileId });
    await sut.execute(dto);

    const correctionEntry = repo.items[1]!;
    expect(correctionEntry.clientId).toBe(clientId);
    expect(correctionEntry.deliverableId).toBe(deliverableId);
  });

  it('new correction entry has isCorrectionProjection = true', async () => {
    const professionalProfileId = generateId();
    const originalExecutionId = generateId();

    const sourceResult = EntrySource.execution(originalExecutionId);
    if (sourceResult.isLeft()) throw new Error('test setup');
    const originalEntry = makeSelfLogEntry({ professionalProfileId, source: sourceResult.value });
    await repo.save(originalEntry);

    const dto = makePayload({ originalExecutionId, professionalProfileId });
    await sut.execute(dto);

    const correctionEntry = repo.items[1]!;
    expect(correctionEntry.isCorrectionProjection).toBe(true);
  });

  it('publishes SelfLogCorrectionProjected event with correct payload post-save', async () => {
    const professionalProfileId = generateId();
    const originalExecutionId = generateId();
    const correctionId = generateId();
    const clientId = generateId();

    const logicalDayResult = LogicalDay.create('2026-03-01');
    if (logicalDayResult.isLeft()) throw new Error('test setup');

    const sourceResult = EntrySource.execution(originalExecutionId);
    if (sourceResult.isLeft()) throw new Error('test setup');
    const originalEntry = makeSelfLogEntry({
      clientId,
      professionalProfileId,
      source: sourceResult.value,
      logicalDay: logicalDayResult.value,
    });
    await repo.save(originalEntry);

    const dto = makePayload({ correctionId, originalExecutionId, professionalProfileId });
    await sut.execute(dto);

    expect(eventPublisher.publishedSelfLogCorrectionProjected).toHaveLength(1);
    const emitted = eventPublisher.publishedSelfLogCorrectionProjected[0]!;
    expect(emitted.eventType).toBe('SelfLogCorrectionProjected');
    expect(emitted.payload.originalEntryId).toBe(originalEntry.id);
    expect(emitted.payload.clientId).toBe(clientId);
    expect(emitted.payload.professionalProfileId).toBe(professionalProfileId);
    expect(emitted.payload.logicalDay).toBe('2026-03-01');
    expect(emitted.payload.correctionId).toBe(correctionId);
    expect(emitted.payload.selfLogEntryId).toBe(repo.items[1]!.id);
  });

  // ── Idempotency guard (ADR-0007) ────────────────────────────────────────────

  it('returns Right<void> without creating a duplicate if the correction is already projected', async () => {
    const professionalProfileId = generateId();
    const originalExecutionId = generateId();
    const correctionId = generateId();

    const sourceResult = EntrySource.execution(originalExecutionId);
    if (sourceResult.isLeft()) throw new Error('test setup');
    const originalEntry = makeSelfLogEntry({ professionalProfileId, source: sourceResult.value });
    await repo.save(originalEntry);

    const dto = makePayload({ correctionId, originalExecutionId, professionalProfileId });

    // First projection
    await sut.execute(dto);
    expect(repo.items).toHaveLength(2);

    // Second call with the same payload (at-least-once delivery simulation — ADR-0016)
    const result = await sut.execute(dto);

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(2); // No duplicate
    expect(eventPublisher.publishedSelfLogCorrectionProjected).toHaveLength(1); // No duplicate event
  });

  // ── Silent skip ─────────────────────────────────────────────────────────────

  it('returns Right<void> silently when original projection does not exist', async () => {
    const dto = makePayload();

    const result = await sut.execute(dto);

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
    expect(eventPublisher.publishedSelfLogCorrectionProjected).toHaveLength(0);
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  it('returns Left<InvalidSelfLogSourceError> when the correctionId is not a valid UUID', async () => {
    const professionalProfileId = generateId();
    const originalExecutionId = generateId();

    // Seed original entry so we get past the idempotency + original-not-found checks
    const sourceResult = EntrySource.execution(originalExecutionId);
    if (sourceResult.isLeft()) throw new Error('test setup');
    const originalEntry = makeSelfLogEntry({ professionalProfileId, source: sourceResult.value });
    await repo.save(originalEntry);

    const dto = makePayload({
      correctionId: 'not-a-uuid',
      originalExecutionId,
      professionalProfileId,
    });

    const result = await sut.execute(dto);

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_SOURCE);
    }
  });

  // ── Tenant isolation (ADR-0025) ────────────────────────────────────────────

  it('does not find the original entry when queried under a different tenant', async () => {
    const tenantA = generateId();
    const tenantB = generateId();
    const originalExecutionId = generateId();

    // Seed original entry for tenant A
    const sourceResult = EntrySource.execution(originalExecutionId);
    if (sourceResult.isLeft()) throw new Error('test setup');
    const originalEntry = makeSelfLogEntry({
      professionalProfileId: tenantA,
      source: sourceResult.value,
    });
    await repo.save(originalEntry);

    // Handler runs in tenant B context — original entry is invisible
    const dto = makePayload({
      originalExecutionId,
      professionalProfileId: tenantB,
    });

    const result = await sut.execute(dto);

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(1); // No correction entry created
    expect(eventPublisher.publishedSelfLogCorrectionProjected).toHaveLength(0);
  });
});
