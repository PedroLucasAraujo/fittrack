import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { GetDeliverableTemplate } from '../../../application/use-cases/get-deliverable-template.js';
import { InMemoryDeliverableTemplateRepository } from '../../repositories/in-memory-deliverable-template-repository.js';
import { TemplateStatus } from '../../../domain/enums/template-status.js';
import { DeliverableType } from '../../../domain/enums/deliverable-type.js';
import { TemplateErrorCodes } from '../../../domain/errors/template-error-codes.js';
import { makeDeliverableTemplate } from '../../factories/make-deliverable-template.js';

describe('GetDeliverableTemplate', () => {
  let templateRepository: InMemoryDeliverableTemplateRepository;
  let sut: GetDeliverableTemplate;

  beforeEach(() => {
    templateRepository = new InMemoryDeliverableTemplateRepository();
    sut = new GetDeliverableTemplate(templateRepository);
  });

  it('returns the template DTO when found', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    templateRepository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.templateId).toBe(template.id);
      expect(result.value.professionalProfileId).toBe(template.professionalProfileId);
      expect(result.value.status).toBe(TemplateStatus.ACTIVE);
      expect(result.value.type).toBe(DeliverableType.TRAINING_PRESCRIPTION);
      expect(result.value.version).toBe(1);
    }
  });

  it('returns TEMPLATE_NOT_FOUND when template does not exist', async () => {
    const result = await sut.execute({
      templateId: generateId(),
      professionalProfileId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_FOUND);
    }
  });

  it('returns TEMPLATE_NOT_FOUND when template belongs to another professional (ADR-0025 — 404 not 403)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    templateRepository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: generateId(), // different professional
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

  it('output DTO contains all expected fields', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT, version: 2 });
    templateRepository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const dto = result.value;
      expect(dto.templateId).toBeDefined();
      expect(dto.name).toBeDefined();
      expect(dto.status).toBe(TemplateStatus.DRAFT);
      expect(dto.version).toBe(2);
      expect(dto.usageCount).toBe(0);
      expect(dto.tags).toEqual([]);
      expect(dto.createdAtUtc).toBeDefined();
      expect(dto.updatedAtUtc).toBeDefined();
    }
  });
});
