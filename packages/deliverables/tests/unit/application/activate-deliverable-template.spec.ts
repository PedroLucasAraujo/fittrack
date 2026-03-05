import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ActivateDeliverableTemplate } from '../../../application/use-cases/activate-deliverable-template.js';
import { InMemoryDeliverableTemplateRepository } from '../../repositories/in-memory-deliverable-template-repository.js';
import { StubDeliverableTemplateEventPublisher } from '../../stubs/stub-deliverable-template-event-publisher.js';
import { TemplateStatus } from '../../../domain/enums/template-status.js';
import { TemplateErrorCodes } from '../../../domain/errors/template-error-codes.js';
import { makeDeliverableTemplate } from '../../factories/make-deliverable-template.js';
import { WorkoutTemplateStructure } from '../../../domain/value-objects/template-structure/workout-template-structure.js';

describe('ActivateDeliverableTemplate', () => {
  let repository: InMemoryDeliverableTemplateRepository;
  let eventPublisher: StubDeliverableTemplateEventPublisher;
  let sut: ActivateDeliverableTemplate;

  beforeEach(() => {
    repository = new InMemoryDeliverableTemplateRepository();
    eventPublisher = new StubDeliverableTemplateEventPublisher();
    sut = new ActivateDeliverableTemplate(repository, eventPublisher);
  });

  it('activates a DRAFT template successfully', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(TemplateStatus.ACTIVE);
      expect(result.value.activatedAtUtc).not.toBeNull();
    }
  });

  it('persists the activated template', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    const saved = repository.items[0];
    expect(saved?.status).toBe(TemplateStatus.ACTIVE);
  });

  it('publishes DeliverableTemplateActivated event post-save (ADR-0047)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    expect(eventPublisher.publishedActivatedEvents).toHaveLength(1);
    expect(eventPublisher.publishedActivatedEvents[0]?.payload.templateId).toBe(template.id);
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

  it('returns not found when template belongs to different professional (tenant isolation)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: generateId(), // different professional
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_FOUND);
    }
  });

  it('returns error when template already ACTIVE', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_TRANSITION);
    }
  });

  it('returns error when template structure is invalid (empty sessions)', async () => {
    const emptyStructure = WorkoutTemplateStructure.create([]);
    const template = makeDeliverableTemplate({
      status: TemplateStatus.DRAFT,
      structure: emptyStructure,
    });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE);
    }
  });

  it('does not publish event when activation fails', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(template);

    await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    expect(eventPublisher.publishedActivatedEvents).toHaveLength(0);
  });
});
