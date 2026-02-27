import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { RecordSelfLogEntry } from '../../../application/use-cases/record-self-log-entry.js';
import { EntrySourceType } from '../../../domain/enums/entry-source-type.js';
import { SelfLogErrorCodes } from '../../../domain/errors/self-log-error-codes.js';
import { InMemorySelfLogEntryRepositoryStub } from '../../stubs/in-memory-self-log-entry-repository-stub.js';
import { InMemorySelfLogEventPublisherStub } from '../../stubs/in-memory-self-log-event-publisher-stub.js';

describe('RecordSelfLogEntry', () => {
  let repo: InMemorySelfLogEntryRepositoryStub;
  let eventPublisher: InMemorySelfLogEventPublisherStub;
  let sut: RecordSelfLogEntry;

  let clientId: string;
  let professionalProfileId: string;

  beforeEach(() => {
    repo = new InMemorySelfLogEntryRepositoryStub();
    eventPublisher = new InMemorySelfLogEventPublisherStub();
    sut = new RecordSelfLogEntry(repo, eventPublisher);

    clientId = generateId();
    professionalProfileId = generateId();
  });

  // ── Happy paths ─────────────────────────────────────────────────────────────

  it('creates a SELF entry and returns selfLogEntryId', async () => {
    const result = await sut.execute({
      clientId,
      professionalProfileId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.selfLogEntryId).toBeDefined();
      expect(result.value.selfLogEntryId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }
  });

  it('persists the entry to the repository', async () => {
    await sut.execute({
      clientId,
      professionalProfileId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(repo.items).toHaveLength(1);
    expect(repo.items[0]?.source.sourceType).toBe(EntrySourceType.SELF);
    expect(repo.items[0]?.source.sourceId).toBeNull();
  });

  it('publishes a SelfLogRecorded event post-save (ADR-0009 §4)', async () => {
    await sut.execute({
      clientId,
      professionalProfileId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(eventPublisher.publishedSelfLogRecorded).toHaveLength(1);
    const event = eventPublisher.publishedSelfLogRecorded[0]!;
    expect(event.eventType).toBe('SelfLogRecorded');
    expect(event.payload.clientId).toBe(clientId);
    expect(event.payload.professionalProfileId).toBe(professionalProfileId);
    expect(event.payload.sourceType).toBe(EntrySourceType.SELF);
    expect(event.payload.sourceId).toBeNull();
    expect(event.payload.correctedEntryId).toBeNull();
  });

  it('event payload does not contain health data (ADR-0037)', async () => {
    await sut.execute({
      clientId,
      professionalProfileId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
      value: 100,
      unit: 'kg',
      note: 'PR day!',
    });

    const event = eventPublisher.publishedSelfLogRecorded[0]!;
    expect(event.payload).not.toHaveProperty('value');
    expect(event.payload).not.toHaveProperty('unit');
    expect(event.payload).not.toHaveProperty('note');
  });

  it('stores all optional fields on the persisted entry', async () => {
    const correctedEntryId = generateId();
    await sut.execute({
      clientId,
      professionalProfileId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
      note: 'Good session',
      value: 30,
      unit: 'reps',
      correctedEntryId,
    });

    const entry = repo.items[0]!;
    expect(entry.value).toBe(30);
    expect(entry.unit).toBe('reps');
    expect(entry.note?.value).toBe('Good session');
    expect(entry.correctedEntryId).toBe(correctedEntryId);
  });

  it('derives correct logicalDay from timezone (ADR-0010)', async () => {
    // 23:00 UTC on Feb 22 = Feb 22 in UTC but Feb 23 in UTC+3 (e.g., Moscow)
    await sut.execute({
      clientId,
      professionalProfileId,
      occurredAtUtc: '2026-02-22T23:00:00.000Z',
      timezoneUsed: 'Europe/Moscow', // UTC+3
    });

    const entry = repo.items[0]!;
    expect(entry.logicalDay.value).toBe('2026-02-23');
    expect(entry.timezoneUsed).toBe('Europe/Moscow');
  });

  // ── Input validation errors ─────────────────────────────────────────────────

  it('returns Left for invalid occurredAtUtc', async () => {
    const result = await sut.execute({
      clientId,
      professionalProfileId,
      occurredAtUtc: 'not-a-date',
      timezoneUsed: 'UTC',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_ENTRY);
    }
  });

  it('returns Left for invalid timezoneUsed', async () => {
    const result = await sut.execute({
      clientId,
      professionalProfileId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'Not/A/Timezone',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_ENTRY);
    }
  });

  it('returns Left for invalid note (empty)', async () => {
    const result = await sut.execute({
      clientId,
      professionalProfileId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
      note: '',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_ENTRY);
    }
  });

  it('returns Left for negative value', async () => {
    const result = await sut.execute({
      clientId,
      professionalProfileId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
      value: -5,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_ENTRY);
    }
  });

  // ── Tenant isolation (ADR-0025) ────────────────────────────────────────────────

  it('findById returns null for a different tenant (cross-tenant isolation — ADR-0025)', async () => {
    const tenantB = generateId();

    await sut.execute({
      clientId,
      professionalProfileId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(repo.items).toHaveLength(1);
    const entryId = repo.items[0]!.id;

    const crossTenantResult = await repo.findById(entryId, tenantB);
    expect(crossTenantResult).toBeNull();
  });
});
