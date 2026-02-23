import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { AddTemplateField } from '../../../application/use-cases/add-template-field.js';
import { InMemoryAssessmentTemplateRepository } from '../../repositories/in-memory-assessment-template-repository.js';
import { TemplateFieldType } from '../../../domain/enums/template-field-type.js';
import { AssessmentErrorCodes } from '../../../domain/errors/assessment-error-codes.js';
import {
  makeAssessmentTemplate,
  makeActiveAssessmentTemplate,
} from '../../factories/make-assessment-template.js';

describe('AddTemplateField', () => {
  let repository: InMemoryAssessmentTemplateRepository;
  let sut: AddTemplateField;

  beforeEach(() => {
    repository = new InMemoryAssessmentTemplateRepository();
    sut = new AddTemplateField(repository);
  });

  function makeDraftTemplate() {
    // Start with no fields for clean orderIndex tests
    const template = makeAssessmentTemplate({ fields: [] });
    repository.items.push(template);
    return template;
  }

  // ── Happy paths ─────────────────────────────────────────────────────────────

  it('adds a NUMBER field and returns the correct output', async () => {
    const template = makeDraftTemplate();

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      label: 'Weight',
      fieldType: TemplateFieldType.NUMBER,
      unit: 'kg',
      required: true,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const out = result.value;
      expect(out.label).toBe('Weight');
      expect(out.fieldType).toBe(TemplateFieldType.NUMBER);
      expect(out.unit).toBe('kg');
      expect(out.required).toBe(true);
      expect(out.options).toBeNull();
      expect(out.orderIndex).toBe(0);
      expect(out.contentVersion).toBe(2);
    }
  });

  it('adds a TEXT field (no unit)', async () => {
    const template = makeDraftTemplate();

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      label: 'Clinical Notes',
      fieldType: TemplateFieldType.TEXT,
      required: false,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.fieldType).toBe(TemplateFieldType.TEXT);
      expect(result.value.unit).toBeNull();
    }
  });

  it('adds a BOOLEAN field', async () => {
    const template = makeDraftTemplate();

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      label: 'Has Injury',
      fieldType: TemplateFieldType.BOOLEAN,
      required: true,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.fieldType).toBe(TemplateFieldType.BOOLEAN);
  });

  it('adds a SELECT field with options', async () => {
    const template = makeDraftTemplate();

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      label: 'Posture Rating',
      fieldType: TemplateFieldType.SELECT,
      options: ['Good', 'Fair', 'Poor'],
      required: false,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.options).toEqual(['Good', 'Fair', 'Poor']);
    }
  });

  it('persists the updated template', async () => {
    const template = makeDraftTemplate();

    await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      label: 'Height',
      fieldType: TemplateFieldType.NUMBER,
      unit: 'cm',
      required: true,
    });

    const persisted = await repository.findById(template.id, template.professionalProfileId);
    expect(persisted!.fields.length).toBe(1);
  });

  // ── Error paths ─────────────────────────────────────────────────────────────

  it('returns AssessmentTemplateNotFoundError when template does not exist', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      assessmentTemplateId: generateId(),
      label: 'Weight',
      fieldType: TemplateFieldType.NUMBER,
      required: false,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_FOUND);
    }
  });

  it('returns error for an empty label', async () => {
    const template = makeDraftTemplate();

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      label: '',
      fieldType: TemplateFieldType.NUMBER,
      required: false,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE);
    }
  });

  it('returns error for SELECT field with only one option', async () => {
    const template = makeDraftTemplate();

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      label: 'Rating',
      fieldType: TemplateFieldType.SELECT,
      options: ['OnlyOne'],
      required: false,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE);
    }
  });

  it('returns error for SELECT field with no options provided', async () => {
    const template = makeDraftTemplate();

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      label: 'Rating',
      fieldType: TemplateFieldType.SELECT,
      required: false,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE);
    }
  });

  it('returns error when options are provided for a non-SELECT field', async () => {
    const template = makeDraftTemplate();

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      label: 'Weight',
      fieldType: TemplateFieldType.NUMBER,
      options: ['100', '200'],
      required: false,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE);
    }
  });

  it('returns error when unit is provided for a non-NUMBER field', async () => {
    const template = makeDraftTemplate();

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      label: 'Has Pain',
      fieldType: TemplateFieldType.BOOLEAN,
      unit: 'kg',
      required: false,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE);
    }
  });

  it('returns error when template is ACTIVE (not DRAFT)', async () => {
    const activeTemplate = makeActiveAssessmentTemplate();
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      professionalProfileId: activeTemplate.professionalProfileId,
      assessmentTemplateId: activeTemplate.id,
      label: 'Weight',
      fieldType: TemplateFieldType.NUMBER,
      required: false,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_DRAFT);
    }
  });

  it('defaults required to false when not provided', async () => {
    const template = makeDraftTemplate();

    const result = await sut.execute({
      professionalProfileId: template.professionalProfileId,
      assessmentTemplateId: template.id,
      label: 'Blood Pressure',
      fieldType: TemplateFieldType.NUMBER,
      unit: 'mmHg',
      // required intentionally omitted — exercises `dto.required ?? false`
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.required).toBe(false);
    }
  });
});
