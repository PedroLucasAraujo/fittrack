import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ArchiveAssessmentTemplate } from '../../../application/use-cases/archive-assessment-template.js';
import { InMemoryAssessmentTemplateRepository } from '../../repositories/in-memory-assessment-template-repository.js';
import { AssessmentTemplateStatus } from '../../../domain/enums/assessment-template-status.js';
import { AssessmentErrorCodes } from '../../../domain/errors/assessment-error-codes.js';
import {
  makeAssessmentTemplate,
  makeActiveAssessmentTemplate,
  makeArchivedAssessmentTemplate,
} from '../../factories/make-assessment-template.js';

describe('ArchiveAssessmentTemplate', () => {
  let repository: InMemoryAssessmentTemplateRepository;
  let sut: ArchiveAssessmentTemplate;

  beforeEach(() => {
    repository = new InMemoryAssessmentTemplateRepository();
    sut = new ArchiveAssessmentTemplate(repository);
  });

  // ── Happy paths ─────────────────────────────────────────────────────────────

  it('archives a DRAFT template', async () => {
    const template = makeAssessmentTemplate();
    repository.items.push(template);

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(AssessmentTemplateStatus.ARCHIVED);
      expect(result.value.archivedAtUtc).toBeDefined();
    }
  });

  it('archives an ACTIVE template', async () => {
    const template = makeActiveAssessmentTemplate();
    repository.items.push(template);

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.status).toBe(AssessmentTemplateStatus.ARCHIVED);
  });

  it('persists the ARCHIVED template', async () => {
    const template = makeAssessmentTemplate();
    repository.items.push(template);

    await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
    });

    const persisted = await repository.findById(template.id, template.professionalProfileId);
    expect(persisted!.status).toBe(AssessmentTemplateStatus.ARCHIVED);
  });

  // ── Error paths ─────────────────────────────────────────────────────────────

  it('returns AssessmentTemplateNotFoundError when template does not exist', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      assessmentTemplateId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_FOUND);
    }
  });

  it('returns transition error when template is already ARCHIVED', async () => {
    const template = makeArchivedAssessmentTemplate();
    repository.items.push(template);

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE_TRANSITION);
    }
  });
});
