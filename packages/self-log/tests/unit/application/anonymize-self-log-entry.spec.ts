import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { AnonymizeSelfLogEntry } from '../../../application/use-cases/anonymize-self-log-entry.js';
import { SelfLogErrorCodes } from '../../../domain/errors/self-log-error-codes.js';
import { InMemorySelfLogEntryRepositoryStub } from '../../stubs/in-memory-self-log-entry-repository-stub.js';
import { InMemorySelfLogEventPublisherStub } from '../../stubs/in-memory-self-log-event-publisher-stub.js';
import { makeSelfLogEntry } from '../../factories/make-self-log-entry.js';

// ── AnonymizeSelfLogEntry ─────────────────────────────────────────────────────

describe('AnonymizeSelfLogEntry', () => {
  let repo: InMemorySelfLogEntryRepositoryStub;
  let eventPublisher: InMemorySelfLogEventPublisherStub;
  let sut: AnonymizeSelfLogEntry;

  const DELETED_AT = '2026-03-01T12:00:00.000Z';

  beforeEach(() => {
    repo = new InMemorySelfLogEntryRepositoryStub();
    eventPublisher = new InMemorySelfLogEventPublisherStub();
    sut = new AnonymizeSelfLogEntry(repo, eventPublisher);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('anonymizes entry and returns Right<void>', async () => {
    const professionalProfileId = generateId();
    const entry = makeSelfLogEntry({ professionalProfileId, value: 42, unit: 'kg' });
    await repo.save(entry);

    const result = await sut.execute({
      selfLogEntryId: entry.id,
      professionalProfileId,
      deletedAtUtc: DELETED_AT,
    });

    expect(result.isRight()).toBe(true);
    const saved = await repo.findById(entry.id, professionalProfileId);
    expect(saved?.isDeleted).toBe(true);
    expect(saved?.value).toBeNull();
    expect(saved?.unit).toBeNull();
    expect(saved?.note).toBeNull();
  });

  it('publishes SelfLogAnonymized event post-save with no health data (ADR-0037)', async () => {
    const professionalProfileId = generateId();
    const clientId = generateId();
    const entry = makeSelfLogEntry({ professionalProfileId, clientId, value: 100 });
    await repo.save(entry);

    await sut.execute({
      selfLogEntryId: entry.id,
      professionalProfileId,
      deletedAtUtc: DELETED_AT,
    });

    expect(eventPublisher.publishedSelfLogAnonymized).toHaveLength(1);
    const event = eventPublisher.publishedSelfLogAnonymized[0]!;
    expect(event.eventType).toBe('SelfLogAnonymized');
    expect(event.payload.selfLogEntryId).toBe(entry.id);
    expect(event.payload.clientId).toBe(clientId);
    expect(event.payload.professionalProfileId).toBe(professionalProfileId);
    // No health data in payload (ADR-0037)
    expect(event.payload).not.toHaveProperty('value');
    expect(event.payload).not.toHaveProperty('unit');
    expect(event.payload).not.toHaveProperty('note');
  });

  // ── Tenant isolation (ADR-0025) ─────────────────────────────────────────────

  it('returns Left<SelfLogEntryNotFoundError> when professionalProfileId does not match (cross-tenant access)', async () => {
    const tenantA = generateId();
    const tenantB = generateId();
    const entry = makeSelfLogEntry({ professionalProfileId: tenantA });
    await repo.save(entry);

    const result = await sut.execute({
      selfLogEntryId: entry.id,
      professionalProfileId: tenantB,
      deletedAtUtc: DELETED_AT,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SelfLogErrorCodes.ENTRY_NOT_FOUND);
    }
    // Entry must NOT have been anonymized
    expect(eventPublisher.publishedSelfLogAnonymized).toHaveLength(0);
  });

  // ── Not found ───────────────────────────────────────────────────────────────

  it('returns Left<SelfLogEntryNotFoundError> when entry does not exist', async () => {
    const result = await sut.execute({
      selfLogEntryId: generateId(),
      professionalProfileId: generateId(),
      deletedAtUtc: DELETED_AT,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SelfLogErrorCodes.ENTRY_NOT_FOUND);
    }
  });

  // ── Already anonymized guard ────────────────────────────────────────────────

  it('returns Left<SelfLogAlreadyAnonymizedError> when entry is already anonymized', async () => {
    const professionalProfileId = generateId();
    const entry = makeSelfLogEntry({ professionalProfileId });
    await repo.save(entry);

    // First anonymization
    await sut.execute({
      selfLogEntryId: entry.id,
      professionalProfileId,
      deletedAtUtc: DELETED_AT,
    });

    // Second call — aggregate guard fires
    const result = await sut.execute({
      selfLogEntryId: entry.id,
      professionalProfileId,
      deletedAtUtc: DELETED_AT,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SelfLogErrorCodes.ALREADY_ANONYMIZED);
    }
    // Event must only have been published once
    expect(eventPublisher.publishedSelfLogAnonymized).toHaveLength(1);
  });

  // ── Input validation ────────────────────────────────────────────────────────

  it('returns Left<InvalidSelfLogEntryError> for an invalid deletedAtUtc', async () => {
    const result = await sut.execute({
      selfLogEntryId: generateId(),
      professionalProfileId: generateId(),
      deletedAtUtc: 'not-a-date',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_ENTRY);
    }
  });
});
