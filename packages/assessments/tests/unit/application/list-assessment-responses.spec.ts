import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ListAssessmentResponses } from '../../../application/use-cases/list-assessment-responses.js';
import { InMemoryAssessmentResponseRepository } from '../../repositories/in-memory-assessment-response-repository.js';
import { makeAssessmentResponse } from '../../factories/make-assessment-response.js';

describe('ListAssessmentResponses', () => {
  let repository: InMemoryAssessmentResponseRepository;
  let sut: ListAssessmentResponses;

  beforeEach(() => {
    repository = new InMemoryAssessmentResponseRepository();
    sut = new ListAssessmentResponses(repository);
  });

  // ── All responses for client ─────────────────────────────────────────────────

  it('returns an empty list when the client has no responses', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      clientId: generateId(),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(0);
      expect(result.value.responses).toHaveLength(0);
    }
  });

  it('returns all responses for a client across all deliverables', async () => {
    const professionalProfileId = generateId();
    const clientId = generateId();

    const r1 = makeAssessmentResponse({ professionalProfileId, clientId });
    const r2 = makeAssessmentResponse({ professionalProfileId, clientId });
    const otherClient = makeAssessmentResponse({ professionalProfileId }); // different clientId

    repository.items.push(r1, r2, otherClient);

    const result = await sut.execute({ professionalProfileId, clientId });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(2);
      expect(result.value.professionalProfileId).toBe(professionalProfileId);
      expect(result.value.clientId).toBe(clientId);
    }
  });

  it('excludes responses from other tenants', async () => {
    const clientId = generateId();
    const myPid = generateId();
    const theirPid = generateId();

    repository.items.push(makeAssessmentResponse({ professionalProfileId: myPid, clientId }));
    repository.items.push(makeAssessmentResponse({ professionalProfileId: theirPid, clientId }));

    const result = await sut.execute({ professionalProfileId: myPid, clientId });

    if (result.isRight()) expect(result.value.total).toBe(1);
  });

  // ── Filtered by deliverableId ─────────────────────────────────────────────────

  it('returns only responses for the given deliverableId when filter is applied', async () => {
    const professionalProfileId = generateId();
    const clientId = generateId();
    const deliverableId = generateId();

    const matching = makeAssessmentResponse({ professionalProfileId, clientId, deliverableId });
    const nonMatching = makeAssessmentResponse({ professionalProfileId, clientId }); // different deliverableId

    repository.items.push(matching, nonMatching);

    const result = await sut.execute({ professionalProfileId, clientId, deliverableId });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(1);
      expect(result.value.responses[0]!.deliverableId).toBe(deliverableId);
    }
  });

  it('returns empty list when no responses match the deliverableId filter', async () => {
    const professionalProfileId = generateId();
    const clientId = generateId();

    repository.items.push(makeAssessmentResponse({ professionalProfileId, clientId }));

    const result = await sut.execute({
      professionalProfileId,
      clientId,
      deliverableId: generateId(), // different deliverableId
    });

    if (result.isRight()) expect(result.value.total).toBe(0);
  });

  // ── Output shape ─────────────────────────────────────────────────────────────

  it('maps each response to the expected summary shape', async () => {
    const professionalProfileId = generateId();
    const clientId = generateId();
    const response = makeAssessmentResponse({ professionalProfileId, clientId });
    repository.items.push(response);

    const result = await sut.execute({ professionalProfileId, clientId });

    if (result.isRight()) {
      const summary = result.value.responses[0]!;
      expect(summary.assessmentResponseId).toBe(response.id);
      expect(summary.executionId).toBe(response.executionId);
      expect(summary.deliverableId).toBe(response.deliverableId);
      expect(summary.clientId).toBe(response.clientId);
      expect(summary.logicalDay).toBe('2026-02-22');
      expect(summary.timezoneUsed).toBe('America/Sao_Paulo');
      expect(summary.responseCount).toBe(1);
      expect(summary.responses).toHaveLength(1);
      expect(summary.createdAtUtc).toMatch(/Z$/);
    }
  });
});
