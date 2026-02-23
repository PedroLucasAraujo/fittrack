import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CreateAssessmentTemplate } from '../../../application/use-cases/create-assessment-template.js';
import { InMemoryAssessmentTemplateRepository } from '../../repositories/in-memory-assessment-template-repository.js';
import { AssessmentTemplateStatus } from '../../../domain/enums/assessment-template-status.js';
import { AssessmentErrorCodes } from '../../../domain/errors/assessment-error-codes.js';

describe('CreateAssessmentTemplate', () => {
  let repository: InMemoryAssessmentTemplateRepository;
  let sut: CreateAssessmentTemplate;

  beforeEach(() => {
    repository = new InMemoryAssessmentTemplateRepository();
    sut = new CreateAssessmentTemplate(repository);
  });

  // ── Happy paths ─────────────────────────────────────────────────────────────

  it('creates a DRAFT template with no fields and contentVersion 1', async () => {
    const professionalProfileId = generateId();

    const result = await sut.execute({
      professionalProfileId,
      title: 'Body Composition',
      description: 'Full body scan template',
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const out = result.value;
      expect(out.status).toBe(AssessmentTemplateStatus.DRAFT);
      expect(out.contentVersion).toBe(1);
      expect(out.professionalProfileId).toBe(professionalProfileId);
      expect(out.title).toBe('Body Composition');
      expect(out.description).toBe('Full body scan template');
      expect(out.logicalDay).toBe('2026-02-22');
      expect(out.timezoneUsed).toBe('America/Sao_Paulo');
      expect(out.createdAtUtc).toMatch(/Z$/);
    }
  });

  it('persists the template in the repository', async () => {
    await sut.execute({
      professionalProfileId: generateId(),
      title: 'Postural Assessment',
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(repository.items).toHaveLength(1);
  });

  it('defaults description to null when omitted', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Flexibility Test',
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    if (result.isRight()) expect(result.value.description).toBeNull();
  });

  // ── Validation errors ────────────────────────────────────────────────────────

  it('returns error for invalid professionalProfileId', async () => {
    const result = await sut.execute({
      professionalProfileId: 'not-a-uuid',
      title: 'Test',
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for empty title', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: '',
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE);
    }
  });

  it('returns error for a title exceeding 120 characters', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'A'.repeat(121),
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE);
    }
  });

  it('returns error for a non-UTC createdAtUtc string', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Test',
      createdAtUtc: '2026-02-22T10:00:00.000+03:00',
      timezoneUsed: 'UTC',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for an invalid IANA timezoneUsed', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Test',
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'Not/A/Timezone',
    });

    expect(result.isLeft()).toBe(true);
  });
});
