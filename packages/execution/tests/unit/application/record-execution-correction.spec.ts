import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { RecordExecutionCorrection } from '../../../application/use-cases/record-execution-correction.js';
import { ExecutionErrorCodes } from '../../../domain/errors/execution-error-codes.js';
import { ExecutionStatus } from '../../../domain/value-objects/execution-status.js';
import { InMemoryExecutionRepository } from '../../repositories/in-memory-execution-repository.js';
import { InMemoryExecutionEventPublisherStub } from '../../stubs/in-memory-execution-event-publisher-stub.js';
import { makeExecution } from '../../factories/make-execution.js';

describe('RecordExecutionCorrection', () => {
  let repository: InMemoryExecutionRepository;
  let eventPublisher: InMemoryExecutionEventPublisherStub;
  let sut: RecordExecutionCorrection;

  beforeEach(() => {
    repository = new InMemoryExecutionRepository();
    eventPublisher = new InMemoryExecutionEventPublisherStub();
    sut = new RecordExecutionCorrection(repository, eventPublisher);
  });

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('records a correction and returns the output DTO', async () => {
    const profileId = generateId();
    const execution = makeExecution({ professionalProfileId: profileId }); // CONFIRMED by default
    await repository.save(execution);

    const correctedBy = generateId();
    const result = await sut.execute({
      executionId: execution.id,
      professionalProfileId: profileId,
      reason: 'Session was recorded under wrong client',
      correctedBy,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.executionId).toBe(execution.id);
      expect(output.reason).toBe('Session was recorded under wrong client');
      expect(output.correctedBy).toBe(correctedBy);
      expect(output.correctionId).toBeDefined();
      expect(output.correctedAtUtc).toBeDefined();
    }
  });

  it('persists the correction on the Execution in the repository', async () => {
    const profileId = generateId();
    const execution = makeExecution({ professionalProfileId: profileId }); // CONFIRMED by default
    await repository.save(execution);

    await sut.execute({
      executionId: execution.id,
      professionalProfileId: profileId,
      reason: 'Correction reason',
      correctedBy: profileId,
    });

    const saved = repository.items.find((e) => e.id === execution.id);
    expect(saved?.corrections).toHaveLength(1);
    expect(saved?.corrections[0]?.reason).toBe('Correction reason');
  });

  it('does not modify the original Execution fields (ADR-0005 immutability)', async () => {
    const profileId = generateId();
    const deliverableId = generateId();
    const execution = makeExecution({ professionalProfileId: profileId, deliverableId }); // CONFIRMED
    await repository.save(execution);

    await sut.execute({
      executionId: execution.id,
      professionalProfileId: profileId,
      reason: 'Some correction',
      correctedBy: profileId,
    });

    const saved = repository.items.find((e) => e.id === execution.id);
    expect(saved?.deliverableId).toBe(deliverableId);
    expect(saved?.professionalProfileId).toBe(profileId);
  });

  it('dispatches ExecutionCorrectionRecorded event post-commit (ADR-0009 §4)', async () => {
    const profileId = generateId();
    const execution = makeExecution({ professionalProfileId: profileId }); // CONFIRMED
    await repository.save(execution);

    await sut.execute({
      executionId: execution.id,
      professionalProfileId: profileId,
      reason: 'Client absent — rescheduled',
      correctedBy: profileId,
    });

    expect(eventPublisher.publishedCorrectionRecorded).toHaveLength(1);
    const event = eventPublisher.publishedCorrectionRecorded[0]!;
    expect(event.eventType).toBe('ExecutionCorrectionRecorded');
    expect(event.aggregateId).toBe(execution.id);
    expect(event.payload.originalExecutionId).toBe(execution.id);
    expect(event.payload.reason).toBe('Client absent — rescheduled');
  });

  // ── Tenant isolation (ADR-0025) ────────────────────────────────────────────

  it('returns Left<ExecutionNotFoundError> for wrong professionalProfileId (cross-tenant)', async () => {
    const ownerProfileId = generateId();
    const execution = makeExecution({ professionalProfileId: ownerProfileId }); // CONFIRMED
    await repository.save(execution);

    const result = await sut.execute({
      executionId: execution.id,
      professionalProfileId: generateId(), // different tenant
      reason: 'Some reason',
      correctedBy: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.EXECUTION_NOT_FOUND);
    }
  });

  it('returns Left<ExecutionNotFoundError> when execution does not exist', async () => {
    const result = await sut.execute({
      executionId: generateId(),
      professionalProfileId: generateId(),
      reason: 'Some reason',
      correctedBy: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.EXECUTION_NOT_FOUND);
    }
  });

  // ── Status guard (ADR-0005 §9) ────────────────────────────────────────────

  it('returns Left<InvalidExecutionError> when Execution is PENDING (not CONFIRMED)', async () => {
    const profileId = generateId();
    const execution = makeExecution({
      professionalProfileId: profileId,
      status: ExecutionStatus.PENDING,
    });
    await repository.save(execution);

    const result = await sut.execute({
      executionId: execution.id,
      professionalProfileId: profileId,
      reason: 'Some reason',
      correctedBy: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
    }
  });

  it('does NOT dispatch event when correction fails', async () => {
    const profileId = generateId();
    const execution = makeExecution({
      professionalProfileId: profileId,
      status: ExecutionStatus.PENDING,
    });
    await repository.save(execution);

    await sut.execute({
      executionId: execution.id,
      professionalProfileId: profileId,
      reason: 'Some reason',
      correctedBy: generateId(),
    });

    expect(eventPublisher.publishedCorrectionRecorded).toHaveLength(0);
  });

  // ── Input validation errors ────────────────────────────────────────────────

  it('returns Left<InvalidExecutionError> for invalid correctedBy (not a UUID)', async () => {
    const profileId = generateId();
    const execution = makeExecution({ professionalProfileId: profileId }); // CONFIRMED
    await repository.save(execution);

    const result = await sut.execute({
      executionId: execution.id,
      professionalProfileId: profileId,
      reason: 'Valid reason',
      correctedBy: 'not-a-uuid',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
    }
  });

  // ── Domain validation errors ───────────────────────────────────────────────

  it('returns Left<CorrectionReasonRequiredError> for empty reason', async () => {
    const profileId = generateId();
    const execution = makeExecution({ professionalProfileId: profileId }); // CONFIRMED
    await repository.save(execution);

    const result = await sut.execute({
      executionId: execution.id,
      professionalProfileId: profileId,
      reason: '',
      correctedBy: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.CORRECTION_REASON_REQUIRED);
    }
  });

  it('returns Left<CorrectionReasonRequiredError> for whitespace-only reason', async () => {
    const profileId = generateId();
    const execution = makeExecution({ professionalProfileId: profileId }); // CONFIRMED
    await repository.save(execution);

    const result = await sut.execute({
      executionId: execution.id,
      professionalProfileId: profileId,
      reason: '   ',
      correctedBy: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.CORRECTION_REASON_REQUIRED);
    }
  });
});
