import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ArchiveDeliverableTemplate } from '../../../application/use-cases/archive-deliverable-template.js';
import { InMemoryDeliverableTemplateRepository } from '../../repositories/in-memory-deliverable-template-repository.js';
import { StubDeliverableTemplateEventPublisher } from '../../stubs/stub-deliverable-template-event-publisher.js';
import { TemplateStatus } from '../../../domain/enums/template-status.js';
import { TemplateErrorCodes } from '../../../domain/errors/template-error-codes.js';
import { makeDeliverableTemplate } from '../../factories/make-deliverable-template.js';

describe('ArchiveDeliverableTemplate', () => {
  let repository: InMemoryDeliverableTemplateRepository;
  let eventPublisher: StubDeliverableTemplateEventPublisher;
  let sut: ArchiveDeliverableTemplate;

  beforeEach(() => {
    repository = new InMemoryDeliverableTemplateRepository();
    eventPublisher = new StubDeliverableTemplateEventPublisher();
    sut = new ArchiveDeliverableTemplate(repository, eventPublisher);
  });

  it('archives a DRAFT template', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(TemplateStatus.ARCHIVED);
      expect(result.value.archivedAtUtc).not.toBeNull();
    }
  });

  it('archives an ACTIVE template', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(TemplateStatus.ARCHIVED);
    }
  });

  it('persists the archived template', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(template);

    await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    const saved = repository.items[0];
    expect(saved?.status).toBe(TemplateStatus.ARCHIVED);
  });

  it('publishes DeliverableTemplateArchived event post-save (ADR-0047)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(template);

    await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    expect(eventPublisher.publishedArchivedEvents).toHaveLength(1);
    expect(eventPublisher.publishedArchivedEvents[0]?.payload.templateId).toBe(template.id);
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

  it('returns not found when template belongs to different professional', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_FOUND);
    }
  });

  it('returns error when already ARCHIVED', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ARCHIVED });
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

  it('does not publish event when archiving fails', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ARCHIVED });
    repository.items.push(template);

    await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
    });

    expect(eventPublisher.publishedArchivedEvents).toHaveLength(0);
  });
});
