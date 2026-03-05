import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ListDeliverableTemplates } from '../../../application/use-cases/list-deliverable-templates.js';
import { InMemoryDeliverableTemplateRepository } from '../../repositories/in-memory-deliverable-template-repository.js';
import { TemplateStatus } from '../../../domain/enums/template-status.js';
import { DeliverableType } from '../../../domain/enums/deliverable-type.js';
import { makeDeliverableTemplate } from '../../factories/make-deliverable-template.js';

describe('ListDeliverableTemplates', () => {
  let templateRepository: InMemoryDeliverableTemplateRepository;
  let sut: ListDeliverableTemplates;
  const professionalProfileId = generateId();

  beforeEach(() => {
    templateRepository = new InMemoryDeliverableTemplateRepository();
    sut = new ListDeliverableTemplates(templateRepository);
  });

  it('returns empty array when no templates exist', async () => {
    const result = await sut.execute({ professionalProfileId });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('returns all templates for the professional', async () => {
    templateRepository.items.push(
      makeDeliverableTemplate({ professionalProfileId, status: TemplateStatus.DRAFT }),
      makeDeliverableTemplate({ professionalProfileId, status: TemplateStatus.ACTIVE }),
      makeDeliverableTemplate({ professionalProfileId, status: TemplateStatus.ARCHIVED }),
    );

    const result = await sut.execute({ professionalProfileId });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toHaveLength(3);
    }
  });

  it('does not return templates from another professional (ADR-0025 tenant isolation)', async () => {
    const otherId = generateId();
    templateRepository.items.push(
      makeDeliverableTemplate({ professionalProfileId, status: TemplateStatus.ACTIVE }),
      makeDeliverableTemplate({ professionalProfileId: otherId, status: TemplateStatus.ACTIVE }),
    );

    const result = await sut.execute({ professionalProfileId });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toHaveLength(1);
    }
  });

  it('returns only ACTIVE templates when activeOnly is true', async () => {
    templateRepository.items.push(
      makeDeliverableTemplate({ professionalProfileId, status: TemplateStatus.DRAFT }),
      makeDeliverableTemplate({ professionalProfileId, status: TemplateStatus.ACTIVE }),
      makeDeliverableTemplate({ professionalProfileId, status: TemplateStatus.ACTIVE }),
      makeDeliverableTemplate({ professionalProfileId, status: TemplateStatus.ARCHIVED }),
    );

    const result = await sut.execute({ professionalProfileId, activeOnly: true });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toHaveLength(2);
      expect(result.value.every((t) => t.status === TemplateStatus.ACTIVE)).toBe(true);
    }
  });

  it('filters by type when type is provided', async () => {
    const dietTemplate = makeDeliverableTemplate({
      professionalProfileId,
      status: TemplateStatus.ACTIVE,
    });
    Object.defineProperty(dietTemplate['props'], 'type', {
      value: DeliverableType.DIET_PLAN,
      writable: true,
    });

    templateRepository.items.push(
      makeDeliverableTemplate({ professionalProfileId, status: TemplateStatus.ACTIVE }),
      dietTemplate,
    );

    const result = await sut.execute({
      professionalProfileId,
      type: DeliverableType.TRAINING_PRESCRIPTION,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.type).toBe(DeliverableType.TRAINING_PRESCRIPTION);
    }
  });

  it('type filter takes precedence over activeOnly', async () => {
    const draftTraining = makeDeliverableTemplate({
      professionalProfileId,
      status: TemplateStatus.DRAFT,
    });
    const activeTraining = makeDeliverableTemplate({
      professionalProfileId,
      status: TemplateStatus.ACTIVE,
    });

    templateRepository.items.push(draftTraining, activeTraining);

    // type is provided → uses findByType (ignores activeOnly)
    const result = await sut.execute({
      professionalProfileId,
      type: DeliverableType.TRAINING_PRESCRIPTION,
      activeOnly: true,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      // findByType returns all templates of that type regardless of status
      expect(result.value).toHaveLength(2);
    }
  });

  it('output DTO contains expected fields', async () => {
    templateRepository.items.push(
      makeDeliverableTemplate({ professionalProfileId, status: TemplateStatus.ACTIVE }),
    );

    const result = await sut.execute({ professionalProfileId });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const dto = result.value[0];
      expect(dto).toBeDefined();
      expect(dto?.templateId).toBeDefined();
      expect(dto?.professionalProfileId).toBe(professionalProfileId);
      expect(dto?.name).toBeDefined();
      expect(dto?.type).toBe(DeliverableType.TRAINING_PRESCRIPTION);
      expect(dto?.status).toBe(TemplateStatus.ACTIVE);
      expect(dto?.version).toBe(1);
    }
  });

  it('returns error for invalid professionalProfileId', async () => {
    const result = await sut.execute({ professionalProfileId: 'not-a-uuid' });

    expect(result.isLeft()).toBe(true);
  });
});
