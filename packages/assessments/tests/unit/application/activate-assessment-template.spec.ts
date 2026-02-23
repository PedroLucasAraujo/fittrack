import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ActivateAssessmentTemplate } from '../../../application/use-cases/activate-assessment-template.js';
import { InMemoryAssessmentTemplateRepository } from '../../repositories/in-memory-assessment-template-repository.js';
import { AssessmentTemplateStatus } from '../../../domain/enums/assessment-template-status.js';
import { AssessmentErrorCodes } from '../../../domain/errors/assessment-error-codes.js';
import {
  makeAssessmentTemplate,
  makeActiveAssessmentTemplate,
  makeArchivedAssessmentTemplate,
} from '../../factories/make-assessment-template.js';

describe('ActivateAssessmentTemplate', () => {
  let repository: InMemoryAssessmentTemplateRepository;
  let sut: ActivateAssessmentTemplate;

  beforeEach(() => {
    repository = new InMemoryAssessmentTemplateRepository();
    sut = new ActivateAssessmentTemplate(repository);
  });

  // ── Happy paths ─────────────────────────────────────────────────────────────

  it('activates a DRAFT template that has at least one field', async () => {
    const template = makeAssessmentTemplate(); // has 1 field
    repository.items.push(template);

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const out = result.value;
      expect(out.status).toBe(AssessmentTemplateStatus.ACTIVE);
      expect(out.activatedAtUtc).toBeDefined();
    }
  });

  it('persists the ACTIVE template', async () => {
    const template = makeAssessmentTemplate();
    repository.items.push(template);

    await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
    });

    const persisted = await repository.findById(template.id, template.professionalProfileId);
    expect(persisted!.status).toBe(AssessmentTemplateStatus.ACTIVE);
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

  it('returns EmptyTemplateFieldsError when template has no fields', async () => {
    const template = makeAssessmentTemplate({ fields: [] });
    repository.items.push(template);

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.EMPTY_TEMPLATE_FIELDS);
    }
  });

  it('returns transition error when template is already ACTIVE', async () => {
    const template = makeActiveAssessmentTemplate();
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

  it('returns transition error when template is ARCHIVED', async () => {
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
