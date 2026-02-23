import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { GetExecution } from '../../../application/use-cases/get-execution.js';
import { ExecutionErrorCodes } from '../../../domain/errors/execution-error-codes.js';
import { InMemoryExecutionRepository } from '../../repositories/in-memory-execution-repository.js';
import { makeExecution } from '../../factories/make-execution.js';

describe('GetExecution', () => {
  let repository: InMemoryExecutionRepository;
  let sut: GetExecution;

  beforeEach(() => {
    repository = new InMemoryExecutionRepository();
    sut = new GetExecution(repository);
  });

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('returns the Execution output DTO with all fields', async () => {
    const profileId = generateId();
    const execution = makeExecution({ professionalProfileId: profileId });
    await repository.save(execution);

    const result = await sut.execute({
      executionId: execution.id,
      professionalProfileId: profileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.executionId).toBe(execution.id);
      expect(output.professionalProfileId).toBe(profileId);
      expect(output.clientId).toBe(execution.clientId);
      expect(output.accessGrantId).toBe(execution.accessGrantId);
      expect(output.deliverableId).toBe(execution.deliverableId);
      expect(output.logicalDay).toBe(execution.logicalDay.value);
      expect(output.timezoneUsed).toBe(execution.timezoneUsed);
      expect(output.occurredAtUtc).toBeDefined();
      expect(output.createdAtUtc).toBeDefined();
      expect(output.status).toBe('CONFIRMED');
      expect(output.corrections).toHaveLength(0);
    }
  });

  it('includes correction details in the output', async () => {
    const profileId = generateId();
    const correctedBy = generateId();
    const execution = makeExecution({ professionalProfileId: profileId });
    execution.recordCorrection('Wrong deliverable used', correctedBy);
    await repository.save(execution);

    const result = await sut.execute({
      executionId: execution.id,
      professionalProfileId: profileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.corrections).toHaveLength(1);
      const correction = result.value.corrections[0]!;
      expect(correction.reason).toBe('Wrong deliverable used');
      expect(correction.correctedBy).toBe(correctedBy);
      expect(correction.correctionId).toBeDefined();
      expect(correction.correctedAtUtc).toBeDefined();
    }
  });

  // ── Tenant isolation (ADR-0025) ────────────────────────────────────────────

  it('returns Left<ExecutionNotFoundError> for wrong professionalProfileId (cross-tenant)', async () => {
    const ownerProfileId = generateId();
    const execution = makeExecution({ professionalProfileId: ownerProfileId });
    await repository.save(execution);

    const result = await sut.execute({
      executionId: execution.id,
      professionalProfileId: generateId(), // different tenant
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.EXECUTION_NOT_FOUND);
    }
  });

  it('returns Left<ExecutionNotFoundError> when Execution does not exist', async () => {
    const result = await sut.execute({
      executionId: generateId(),
      professionalProfileId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ExecutionErrorCodes.EXECUTION_NOT_FOUND);
    }
  });
});
