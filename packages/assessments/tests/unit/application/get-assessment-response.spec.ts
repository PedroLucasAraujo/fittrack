import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { GetAssessmentResponse } from '../../../application/use-cases/get-assessment-response.js';
import { InMemoryAssessmentResponseRepository } from '../../repositories/in-memory-assessment-response-repository.js';
import { AssessmentErrorCodes } from '../../../domain/errors/assessment-error-codes.js';
import { makeAssessmentResponse } from '../../factories/make-assessment-response.js';

describe('GetAssessmentResponse', () => {
  let repository: InMemoryAssessmentResponseRepository;
  let sut: GetAssessmentResponse;

  beforeEach(() => {
    repository = new InMemoryAssessmentResponseRepository();
    sut = new GetAssessmentResponse(repository);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('returns the response when found', async () => {
    const response = makeAssessmentResponse();
    repository.items.push(response);

    const result = await sut.execute({
      professionalProfileId: response.professionalProfileId,
      assessmentResponseId: response.id,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const out = result.value;
      expect(out.assessmentResponseId).toBe(response.id);
      expect(out.executionId).toBe(response.executionId);
      expect(out.deliverableId).toBe(response.deliverableId);
      expect(out.professionalProfileId).toBe(response.professionalProfileId);
      expect(out.clientId).toBe(response.clientId);
      expect(out.logicalDay).toBe('2026-02-22');
      expect(out.timezoneUsed).toBe('America/Sao_Paulo');
      expect(out.responseCount).toBe(1);
      expect(out.responses).toHaveLength(1);
      expect(out.createdAtUtc).toMatch(/Z$/);
    }
  });

  // ── Error paths ─────────────────────────────────────────────────────────────

  it('returns AssessmentResponseNotFoundError when response does not exist', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      assessmentResponseId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_RESPONSE_NOT_FOUND);
    }
  });

  it('returns AssessmentResponseNotFoundError for cross-tenant access (wrong professionalProfileId)', async () => {
    const response = makeAssessmentResponse();
    repository.items.push(response);

    const result = await sut.execute({
      professionalProfileId: generateId(), // different tenant
      assessmentResponseId: response.id,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_RESPONSE_NOT_FOUND);
    }
  });
});
