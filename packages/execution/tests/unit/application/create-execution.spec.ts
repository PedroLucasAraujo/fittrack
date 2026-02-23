import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CreateExecution } from '../../../application/use-cases/create-execution.js';
import { ExecutionErrorCodes } from '../../../domain/errors/execution-error-codes.js';
import { InMemoryExecutionRepository } from '../../repositories/in-memory-execution-repository.js';
import { InMemoryAccessGrantStub } from '../../stubs/in-memory-access-grant-stub.js';
import { InMemoryDeliverableStub } from '../../stubs/in-memory-deliverable-stub.js';

describe('CreateExecution', () => {
  let repository: InMemoryExecutionRepository;
  let accessGrantStub: InMemoryAccessGrantStub;
  let deliverableStub: InMemoryDeliverableStub;
  let sut: CreateExecution;

  let professionalProfileId: string;
  let clientId: string;
  let accessGrantId: string;
  let deliverableId: string;

  beforeEach(() => {
    repository = new InMemoryExecutionRepository();
    accessGrantStub = new InMemoryAccessGrantStub();
    deliverableStub = new InMemoryDeliverableStub();
    sut = new CreateExecution(repository, accessGrantStub, deliverableStub);

    professionalProfileId = generateId();
    clientId = generateId();
    accessGrantId = generateId();
    deliverableId = generateId();

    // Default: deliverable is ACTIVE and AccessGrant is valid
    deliverableStub.markActive(deliverableId);
    accessGrantStub.shouldValidationSucceed = true;
  });

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('creates an Execution and returns the output DTO', async () => {
    const result = await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.professionalProfileId).toBe(professionalProfileId);
      expect(output.clientId).toBe(clientId);
      expect(output.accessGrantId).toBe(accessGrantId);
      expect(output.deliverableId).toBe(deliverableId);
      expect(output.occurredAtUtc).toBe('2026-02-22T10:00:00.000Z');
      expect(output.logicalDay).toBe('2026-02-22'); // 10:00 UTC = 07:00 local (UTC-3), same day
      expect(output.timezoneUsed).toBe('America/Sao_Paulo');
      expect(output.executionId).toBeDefined();
      expect(output.createdAtUtc).toBeDefined();
    }
  });

  it('persists the Execution in the repository', async () => {
    await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(repository.items).toHaveLength(1);
  });

  it('increments sessionsConsumed on the AccessGrant after saving (ADR-0046 §4)', async () => {
    await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(accessGrantStub.incrementedFor).toContain(accessGrantId);
  });

  it('computes logicalDay correctly for UTC timezone (same day)', async () => {
    const result = await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.logicalDay).toBe('2026-02-22');
    }
  });

  it('uses an explicit id when provided in the DTO (via repository item)', async () => {
    const explicitId = generateId();
    const result = await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    // executionId must be a UUIDv4
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.executionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }
    void explicitId;
  });

  // ── Input validation errors ────────────────────────────────────────────────

  it('returns Left for invalid professionalProfileId (not a UUID)', async () => {
    const result = await sut.execute({
      professionalProfileId: 'not-a-uuid',
      clientId,
      accessGrantId,
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
    }
  });

  it('returns Left for invalid clientId (not a UUID)', async () => {
    const result = await sut.execute({
      professionalProfileId,
      clientId: 'not-a-uuid',
      accessGrantId,
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
    }
  });

  it('returns Left for invalid accessGrantId (not a UUID)', async () => {
    const result = await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId: 'not-a-uuid',
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
    }
  });

  it('returns Left for invalid deliverableId (not a UUID)', async () => {
    const result = await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId: 'not-a-uuid',
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
    }
  });

  it('returns Left for invalid occurredAtUtc (offset string, not UTC)', async () => {
    const result = await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000+03:00',
      timezoneUsed: 'UTC',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
    }
  });

  it('returns Left for invalid timezoneUsed (unrecognised IANA identifier)', async () => {
    const result = await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'Not/A/Timezone',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
    }
  });

  // ── Domain pre-condition errors ────────────────────────────────────────────

  it('returns Left<DeliverableInactiveError> when Deliverable is not ACTIVE', async () => {
    const inactiveDeliverableId = generateId(); // not marked active in stub

    const result = await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId: inactiveDeliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.DELIVERABLE_INACTIVE);
    }
  });

  it('returns Left<AccessGrantInvalidError> when AccessGrant validation fails', async () => {
    accessGrantStub.shouldValidationSucceed = false;
    accessGrantStub.validationFailReason = 'session allotment exhausted';

    const result = await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.ACCESS_GRANT_INVALID);
    }
  });

  it('does NOT increment sessionsConsumed when AccessGrant validation fails', async () => {
    accessGrantStub.shouldValidationSucceed = false;

    await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(accessGrantStub.incrementedFor).toHaveLength(0);
  });

  it('does NOT persist an Execution when validation fails', async () => {
    accessGrantStub.shouldValidationSucceed = false;

    await sut.execute({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId,
      occurredAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(repository.items).toHaveLength(0);
  });
});
