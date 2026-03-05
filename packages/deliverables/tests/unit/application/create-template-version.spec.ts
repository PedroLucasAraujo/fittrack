import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CreateTemplateVersion } from '../../../application/use-cases/create-template-version.js';
import { InMemoryDeliverableTemplateRepository } from '../../repositories/in-memory-deliverable-template-repository.js';
import { StubDeliverableTemplateEventPublisher } from '../../stubs/stub-deliverable-template-event-publisher.js';
import { TemplateStatus } from '../../../domain/enums/template-status.js';
import { TemplateErrorCodes } from '../../../domain/errors/template-error-codes.js';
import { makeDeliverableTemplate } from '../../factories/make-deliverable-template.js';
import { TemplateName } from '../../../domain/value-objects/template-name.js';

describe('CreateTemplateVersion', () => {
  let repository: InMemoryDeliverableTemplateRepository;
  let eventPublisher: StubDeliverableTemplateEventPublisher;
  let sut: CreateTemplateVersion;

  beforeEach(() => {
    repository = new InMemoryDeliverableTemplateRepository();
    eventPublisher = new StubDeliverableTemplateEventPublisher();
    sut = new CreateTemplateVersion(repository, eventPublisher);
  });

  it('creates a new DRAFT template at version+1 from ACTIVE', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE, version: 1 });
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(TemplateStatus.DRAFT);
      expect(result.value.version).toBe(2);
      expect(result.value.previousVersionId).toBe(activeTemplate.id);
      expect(result.value.templateId).not.toBe(activeTemplate.id);
    }
  });

  it('persists the new version in the repository', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(repository.items).toHaveLength(2);
  });

  it('publishes DeliverableTemplateVersioned event post-save (ADR-0047)', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(eventPublisher.publishedVersionedEvents).toHaveLength(1);
    expect(eventPublisher.publishedVersionedEvents[0]?.payload.previousTemplateId).toBe(
      activeTemplate.id,
    );
  });

  it('applies name change to new version', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      changes: { name: 'Updated Template Name' },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.name).toBe('Updated Template Name');
    }
  });

  it('applies description change to new version', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      changes: { description: 'Updated description' },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.description).toBe('Updated description');
    }
  });

  it('applies structure change to new version', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      changes: {
        structure: {
          sessions: [
            {
              name: 'Day A',
              exercises: [
                {
                  catalogItemId: null,
                  name: 'Deadlift',
                  sets: 4,
                  reps: 5,
                  durationSeconds: null,
                  restSeconds: 120,
                  notes: null,
                },
              ],
            },
          ],
        },
      },
    });

    expect(result.isRight()).toBe(true);
  });

  it('applies parameters change to new version', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      changes: {
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
      },
    });

    expect(result.isRight()).toBe(true);
  });

  it('original template is unchanged after versioning', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE, version: 1 });
    repository.items.push(activeTemplate);

    await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    const original = repository.items.find((t) => t.id === activeTemplate.id);
    expect(original?.status).toBe(TemplateStatus.ACTIVE);
    expect(original?.templateVersion.value).toBe(1);
  });

  it('returns error for invalid professionalProfileId', async () => {
    const result = await sut.execute({
      templateId: generateId(),
      professionalProfileId: 'not-a-uuid',
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for invalid createdAtUtc', async () => {
    const result = await sut.execute({
      templateId: generateId(),
      professionalProfileId: generateId(),
      createdAtUtc: 'not-a-date',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns not found when template does not exist', async () => {
    const result = await sut.execute({
      templateId: generateId(),
      professionalProfileId: generateId(),
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_FOUND);
    }
  });

  it('returns error when source template is DRAFT (not ACTIVE)', async () => {
    const draftTemplate = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
    repository.items.push(draftTemplate);

    const result = await sut.execute({
      templateId: draftTemplate.id,
      professionalProfileId: draftTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_ACTIVE);
    }
  });

  it('returns error when new name is already taken', async () => {
    const professionalProfileId = generateId();
    const takenNameResult = TemplateName.create('Already Taken Name');
    if (takenNameResult.isLeft()) throw new Error('Invalid name');
    const activeTemplate = makeDeliverableTemplate({
      status: TemplateStatus.ACTIVE,
      professionalProfileId,
    });
    const otherTemplate = makeDeliverableTemplate({
      status: TemplateStatus.DRAFT,
      professionalProfileId,
      name: takenNameResult.value,
    });
    repository.items.push(activeTemplate, otherTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      changes: { name: otherTemplate.name.value },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NAME_ALREADY_EXISTS);
    }
  });

  it('allows new version with same name (name unchanged)', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      changes: { name: activeTemplate.name.value },
    });

    expect(result.isRight()).toBe(true);
  });

  it('returns error when changes contain an invalid name (too short)', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      changes: { name: 'AB' }, // too short — TemplateName requires ≥3 chars
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error when changes contain an invalid structure (missing sessions)', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      changes: { structure: { notSessions: [] } }, // invalid — sessions array missing
    });

    expect(result.isLeft()).toBe(true);
  });

  it('applies tags change to new version', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      changes: { tags: ['strength', 'advanced'] },
    });

    expect(result.isRight()).toBe(true);
  });

  it('applies parameters change (null min/max — null fallback)', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      changes: {
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
      },
    });

    expect(result.isRight()).toBe(true);
  });

  // ── Parameter validation failures (S-002) ─────────────────────────────────

  it('returns error when new version parameter has empty name', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      changes: {
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
      },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('returns error when new version has select parameter with no options', async () => {
    const activeTemplate = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
    repository.items.push(activeTemplate);

    const result = await sut.execute({
      templateId: activeTemplate.id,
      professionalProfileId: activeTemplate.professionalProfileId,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      changes: {
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
      },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });
});
