import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { InstantiateDeliverableTemplate } from '../../../application/use-cases/instantiate-deliverable-template.js';
import { InMemoryDeliverableTemplateRepository } from '../../repositories/in-memory-deliverable-template-repository.js';
import { InMemoryDeliverableRepository } from '../../repositories/in-memory-deliverable-repository.js';
import { StubDeliverableTemplateEventPublisher } from '../../stubs/stub-deliverable-template-event-publisher.js';
import { TemplateStatus } from '../../../domain/enums/template-status.js';
import { TemplateErrorCodes } from '../../../domain/errors/template-error-codes.js';
import { DeliverableStatus } from '../../../domain/enums/deliverable-status.js';
import { DeliverableType } from '../../../domain/enums/deliverable-type.js';
import { makeDeliverableTemplate } from '../../factories/make-deliverable-template.js';
import { DietTemplateStructure } from '../../../domain/value-objects/template-structure/diet-template-structure.js';
import { AssessmentTemplateStructure } from '../../../domain/value-objects/template-structure/assessment-template-structure.js';

describe('InstantiateDeliverableTemplate', () => {
  let templateRepository: InMemoryDeliverableTemplateRepository;
  let deliverableRepository: InMemoryDeliverableRepository;
  let eventPublisher: StubDeliverableTemplateEventPublisher;
  let sut: InstantiateDeliverableTemplate;

  beforeEach(() => {
    templateRepository = new InMemoryDeliverableTemplateRepository();
    deliverableRepository = new InMemoryDeliverableRepository();
    eventPublisher = new StubDeliverableTemplateEventPublisher();
    sut = new InstantiateDeliverableTemplate(
      templateRepository,
      deliverableRepository,
      eventPublisher,
    );
  });

  it('creates a DRAFT Deliverable from an ACTIVE TRAINING_PRESCRIPTION template', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    templateRepository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.deliverableId).toBeDefined();
      expect(result.value.templateId).toBe(template.id);
      expect(result.value.templateVersion).toBe(1);
    }
  });

  it('creates Deliverable in DRAFT status (ADR-0011 snapshot semantics)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    templateRepository.items.push(template);

    await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    const deliverable = deliverableRepository.items[0];
    expect(deliverable?.status).toBe(DeliverableStatus.DRAFT);
  });

  it('Deliverable contains originTemplateId and originTemplateVersion (ADR-0011 audit)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE, version: 1 });
    templateRepository.items.push(template);

    await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    const deliverable = deliverableRepository.items[0];
    expect(deliverable?.originTemplateId).toBe(template.id);
    expect(deliverable?.originTemplateVersion).toBe(1);
  });

  it('publishes DeliverableTemplateInstantiated event post-save (ADR-0009 §4)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    templateRepository.items.push(template);

    await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(eventPublisher.publishedInstantiatedEvents).toHaveLength(1);
    const event = eventPublisher.publishedInstantiatedEvents[0]!;
    expect(event.payload.templateId).toBe(template.id);
    expect(event.payload.templateVersion).toBe(1);
    expect(event.payload.professionalProfileId).toBe(template.professionalProfileId);
  });

  it('does NOT modify template aggregate (ADR-0003: one aggregate per transaction)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE, usageCount: 0 });
    templateRepository.items.push(template);

    await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    // usageCount increment is delegated to event handler — template is untouched here
    expect(templateRepository.items[0]?.usageCount).toBe(0);
  });

  it('Deliverable type matches template type (TRAINING_PRESCRIPTION)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    templateRepository.items.push(template);

    await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    const deliverable = deliverableRepository.items[0];
    expect(deliverable?.type).toBe(DeliverableType.TRAINING_PRESCRIPTION);
  });

  it('Deliverable has exercises from template structure (snapshot)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    templateRepository.items.push(template);

    await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    const deliverable = deliverableRepository.items[0];
    expect(deliverable?.exercises.length).toBeGreaterThan(0);
    expect(deliverable?.exercises[0]?.name).toBe('Squat');
  });

  it('creates DIET_PLAN Deliverable from diet template (no exercises)', async () => {
    const dietStructure = DietTemplateStructure.create([
      {
        name: 'Breakfast',
        time: '08:00',
        foods: [{ catalogItemId: null, name: 'Oats', quantity: '100g', notes: null }],
      },
    ]);
    const template = makeDeliverableTemplate({
      status: TemplateStatus.ACTIVE,
      type: DeliverableType.DIET_PLAN,
      structure: dietStructure,
    });
    templateRepository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isRight()).toBe(true);
    const deliverable = deliverableRepository.items[0];
    expect(deliverable?.exercises).toHaveLength(0);
  });

  it('creates PHYSIOLOGICAL_ASSESSMENT Deliverable from assessment template (no exercises)', async () => {
    const assessmentStructure = AssessmentTemplateStructure.create([
      {
        key: 'weight',
        label: 'Current Weight (kg)',
        type: 'number',
        required: true,
        options: null,
      },
    ]);
    const template = makeDeliverableTemplate({
      status: TemplateStatus.ACTIVE,
      type: DeliverableType.PHYSIOLOGICAL_ASSESSMENT,
      structure: assessmentStructure,
    });
    templateRepository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isRight()).toBe(true);
    const deliverable = deliverableRepository.items[0];
    expect(deliverable?.exercises).toHaveLength(0);
  });

  it('template and Deliverable are independent after instantiation (ADR-0011)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    templateRepository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isRight()).toBe(true);

    // Deliverable is independent — archiving template does not affect deliverable
    template.archive();
    const deliverable = deliverableRepository.items[0];
    expect(deliverable?.status).toBe(DeliverableStatus.DRAFT);
  });

  it('returns error for invalid professionalProfileId', async () => {
    const result = await sut.execute({
      templateId: generateId(),
      professionalProfileId: 'not-a-uuid',
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for invalid createdAtUtc', async () => {
    const result = await sut.execute({
      templateId: generateId(),
      professionalProfileId: generateId(),
      createdAtUtc: 'not-a-date',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for invalid timezoneUsed', async () => {
    const result = await sut.execute({
      templateId: generateId(),
      professionalProfileId: generateId(),
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'Not/ATimezone',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns not found when template does not exist', async () => {
    const result = await sut.execute({
      templateId: generateId(),
      professionalProfileId: generateId(),
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_FOUND);
    }
  });

  it('returns error when template is DRAFT (not instantiable)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    templateRepository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_ACTIVE);
    }
  });

  it('returns error when template is ARCHIVED (not instantiable)', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ARCHIVED });
    templateRepository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_ACTIVE);
    }
  });

  it('passes parameterValues to structure snapshot', async () => {
    const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    templateRepository.items.push(template);

    const result = await sut.execute({
      templateId: template.id,
      professionalProfileId: template.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
      parameterValues: { weeks: 8 },
    });

    expect(result.isRight()).toBe(true);
  });
});
