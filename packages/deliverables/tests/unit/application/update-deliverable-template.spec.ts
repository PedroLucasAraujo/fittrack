import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { UpdateDeliverableTemplate } from '../../../application/use-cases/update-deliverable-template.js';
import { InMemoryDeliverableTemplateRepository } from '../../repositories/in-memory-deliverable-template-repository.js';
import { TemplateStatus } from '../../../domain/enums/template-status.js';
import { TemplateErrorCodes } from '../../../domain/errors/template-error-codes.js';
import { makeDeliverableTemplate } from '../../factories/make-deliverable-template.js';
import { TemplateName } from '../../../domain/value-objects/template-name.js';

const VALID_WORKOUT_STRUCTURE = {
  sessions: [
    {
      name: 'Day 1',
      exercises: [
        {
          catalogItemId: null,
          name: 'Squat',
          sets: 3,
          reps: 10,
          durationSeconds: null,
          restSeconds: 60,
          notes: null,
        },
      ],
    },
  ],
};

describe('UpdateDeliverableTemplate', () => {
  let repository: InMemoryDeliverableTemplateRepository;
  let sut: UpdateDeliverableTemplate;

  beforeEach(() => {
    repository = new InMemoryDeliverableTemplateRepository();
    sut = new UpdateDeliverableTemplate(repository);
  });

  it('updates name of a DRAFT template', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      name: 'Updated Name',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.name).toBe('Updated Name');
    }
  });

  it('updates description of a DRAFT template', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      description: 'New description',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.description).toBe('New description');
    }
  });

  it('updates structure of a DRAFT template', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      structure: VALID_WORKOUT_STRUCTURE,
    });

    expect(result.isRight()).toBe(true);
  });

  it('updates parameters of a DRAFT template (with min/max)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      parameters: [
        {
          name: 'weeks',
          type: 'number' as const,
          required: false,
          defaultValue: 8,
          min: 4,
          max: 16,
          options: null,
        },
      ],
    });

    expect(result.isRight()).toBe(true);
  });

  it('updates parameters of a DRAFT template (null min/max — null fallback)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      parameters: [
        {
          name: 'goal',
          type: 'select' as const,
          required: true,
          defaultValue: 'strength',
          min: null,
          max: null,
          options: ['strength', 'endurance'],
        },
      ],
    });

    expect(result.isRight()).toBe(true);
  });

  it('updates tags of a DRAFT template', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      tags: ['strength', 'advanced'],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.tags).toEqual(['strength', 'advanced']);
    }
  });

  it('allows updating to same name (no uniqueness check for unchanged name)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      name: template.name.value,
    });

    expect(result.isRight()).toBe(true);
  });

  it('returns error when new name already exists for another template', async () => {
    const professionalProfileId = generateId();
    const existingNameResult = TemplateName.create('Existing Template Name');
    if (existingNameResult.isLeft()) throw new Error('Invalid name');
    const template1 = makeDeliverableTemplate({
      status: TemplateStatus.DRAFT,
      professionalProfileId,
      name: existingNameResult.value,
    });
    const template2 = makeDeliverableTemplate({
      status: TemplateStatus.DRAFT,
      professionalProfileId,
    });
    repository.items.push(template1, template2);

    const result = await sut.execute({
      templateId: template2.id,
      professionalProfileId,
      name: template1.name.value,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NAME_ALREADY_EXISTS);
    }
  });

  // S-001: cross-tenant isolation
  it('returns not found when templateId belongs to a different professional (tenant isolation — ADR-0025)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: generateId(), // different tenant
      name: 'Hijacked Name',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_FOUND);
    }
  });

  it('returns error for invalid professionalProfileId', async () => {
    const result = await sut.execute({
      templateId: generateId(),
      professionalProfileId: 'not-a-uuid',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns not found when template does not exist', async () => {
    const result = await sut.execute({
      templateId: generateId(),
      professionalProfileId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_FOUND);
    }
  });

  it('returns error when trying to edit ACTIVE template', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      description: 'New description',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_CANNOT_BE_EDITED);
    }
  });

  it('returns error for invalid name', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      name: 'AB', // too short
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('returns error for invalid structure', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      structure: { wrongKey: 'bad' }, // missing 'sessions'
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE);
    }
  });

  // S-002: parameter validation failures
  it('returns error when parameter has empty name', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      parameters: [
        {
          name: '',
          type: 'number' as const,
          required: false,
          defaultValue: null,
          min: null,
          max: null,
          options: null,
        },
      ],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('returns error when select parameter has no options', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      parameters: [
        {
          name: 'goal',
          type: 'select' as const,
          required: false,
          defaultValue: null,
          min: null,
          max: null,
          options: [],
        },
      ],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('returns error when parameter min > max', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      parameters: [
        {
          name: 'weeks',
          type: 'number' as const,
          required: false,
          defaultValue: null,
          min: 52,
          max: 4,
          options: null,
        },
      ],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('returns error when required parameter has null defaultValue', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      parameters: [
        {
          name: 'weeks',
          type: 'number' as const,
          required: true,
          defaultValue: null,
          min: null,
          max: null,
          options: null,
        },
      ],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });
});
