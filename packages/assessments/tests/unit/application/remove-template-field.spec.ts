import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { RemoveTemplateField } from '../../../application/use-cases/remove-template-field.js';
import { InMemoryAssessmentTemplateRepository } from '../../repositories/in-memory-assessment-template-repository.js';
import { AssessmentErrorCodes } from '../../../domain/errors/assessment-error-codes.js';
import {
  makeAssessmentTemplate,
  makeActiveAssessmentTemplate,
} from '../../factories/make-assessment-template.js';

describe('RemoveTemplateField', () => {
  let repository: InMemoryAssessmentTemplateRepository;
  let sut: RemoveTemplateField;

  beforeEach(() => {
    repository = new InMemoryAssessmentTemplateRepository();
    sut = new RemoveTemplateField(repository);
  });

  // ── Happy paths ─────────────────────────────────────────────────────────────

  it('removes an existing field and returns the correct output', async () => {
    const template = makeAssessmentTemplate(); // has 1 field
    repository.items.push(template);
    const fieldId = template.fields[0]!.id;

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      fieldId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const out = result.value;
      expect(out.removedFieldId).toBe(fieldId);
      expect(out.remainingFieldCount).toBe(0);
      expect(out.contentVersion).toBe(2); // factory reconstitutes at contentVersion=1; removeField=2
    }
  });

  it('persists the updated template', async () => {
    const template = makeAssessmentTemplate();
    repository.items.push(template);
    const fieldId = template.fields[0]!.id;

    await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      fieldId,
    });

    const persisted = await repository.findById(template.id, template.professionalProfileId);
    expect(persisted!.fields.length).toBe(0);
  });

  // ── Error paths ─────────────────────────────────────────────────────────────

  it('returns AssessmentTemplateNotFoundError when template does not exist', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      assessmentTemplateId: generateId(),
      fieldId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_FOUND);
    }
  });

  it('returns AssessmentTemplateNotFoundError when template belongs to a different professional (ADR-0025)', async () => {
    const template = makeAssessmentTemplate(); // belongs to professionalA
    repository.items.push(template);

    const result = await sut.execute({
      professionalProfileId: generateId(), // professionalB
      assessmentTemplateId: template.id,
      fieldId: template.fields[0]!.id,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_FOUND);
    }
  });

  it('returns TemplateFieldNotFoundError when fieldId does not exist', async () => {
    const template = makeAssessmentTemplate();
    repository.items.push(template);

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      fieldId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.TEMPLATE_FIELD_NOT_FOUND);
    }
  });

  it('returns AssessmentTemplateNotDraftError when template is ACTIVE', async () => {
    const template = makeActiveAssessmentTemplate();
    repository.items.push(template);
    const fieldId = template.fields[0]!.id;

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      fieldId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_DRAFT);
    }
  });
});
