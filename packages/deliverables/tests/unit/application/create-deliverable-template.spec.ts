import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CreateDeliverableTemplate } from '../../../application/use-cases/create-deliverable-template.js';
import { InMemoryDeliverableTemplateRepository } from '../../repositories/in-memory-deliverable-template-repository.js';
import { StubDeliverableTemplateEventPublisher } from '../../stubs/stub-deliverable-template-event-publisher.js';
import { TemplateStatus } from '../../../domain/enums/template-status.js';
import { DeliverableType } from '../../../domain/enums/deliverable-type.js';
import { TemplateErrorCodes } from '../../../domain/errors/template-error-codes.js';

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

const VALID_DIET_STRUCTURE = {
  meals: [
    {
      name: 'Breakfast',
      time: '08:00',
      foods: [{ catalogItemId: null, name: 'Oats', quantity: '100g', notes: null }],
    },
  ],
};

const VALID_ASSESSMENT_STRUCTURE = {
  questions: [
    { key: 'weight', label: 'Current Weight (kg)', type: 'number', required: true, options: null },
  ],
};

describe('CreateDeliverableTemplate', () => {
  let repository: InMemoryDeliverableTemplateRepository;
  let eventPublisher: StubDeliverableTemplateEventPublisher;
  let sut: CreateDeliverableTemplate;

  beforeEach(() => {
    repository = new InMemoryDeliverableTemplateRepository();
    eventPublisher = new StubDeliverableTemplateEventPublisher();
    sut = new CreateDeliverableTemplate(repository, eventPublisher);
  });

  it('creates a TRAINING_PRESCRIPTION template in DRAFT status', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Full Body Workout',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(TemplateStatus.DRAFT);
      expect(result.value.version).toBe(1);
      expect(result.value.name).toBe('Full Body Workout');
      expect(result.value.type).toBe(DeliverableType.TRAINING_PRESCRIPTION);
      expect(result.value.usageCount).toBe(0);
    }
  });

  it('creates a DIET_PLAN template', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Low Carb Diet',
      type: DeliverableType.DIET_PLAN,
      structure: VALID_DIET_STRUCTURE,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.type).toBe(DeliverableType.DIET_PLAN);
    }
  });

  it('creates a PHYSIOLOGICAL_ASSESSMENT template', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Body Assessment',
      type: DeliverableType.PHYSIOLOGICAL_ASSESSMENT,
      structure: VALID_ASSESSMENT_STRUCTURE,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.type).toBe(DeliverableType.PHYSIOLOGICAL_ASSESSMENT);
    }
  });

  it('stores description and tags when provided', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'My Template',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      description: 'A great program',
      tags: ['strength', 'beginner'],
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.description).toBe('A great program');
      expect(result.value.tags).toEqual(['strength', 'beginner']);
    }
  });

  it('persists the template in the repository', async () => {
    await sut.execute({
      professionalProfileId: generateId(),
      name: 'Strength Program',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(repository.items).toHaveLength(1);
  });

  it('publishes DeliverableTemplateCreated event post-save (ADR-0047)', async () => {
    const professionalProfileId = generateId();

    await sut.execute({
      professionalProfileId,
      name: 'Event Test Template',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(eventPublisher.publishedCreatedEvents).toHaveLength(1);
    expect(eventPublisher.publishedCreatedEvents[0]?.payload.professionalProfileId).toBe(
      professionalProfileId,
    );
  });

  it('creates template with parameters (with min/max)', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Configurable Program',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      parameters: [
        { name: 'weeks', type: 'number', required: false, defaultValue: 12, min: 4, max: 52 },
      ],
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
  });

  it('creates template with parameters (no min/max — null fallback)', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Open Range Program',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      parameters: [
        {
          name: 'goal',
          type: 'select',
          required: true,
          defaultValue: 'strength',
          min: null,
          max: null,
          options: ['strength', 'endurance'],
        },
      ],
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
  });

  // ── Parameter validation failures (S-002) ─────────────────────────────────

  it('returns error when parameter has empty name', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Bad Params',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      parameters: [
        { name: '', type: 'number', required: false, defaultValue: null, min: null, max: null },
      ],
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('returns error when select parameter has no options', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Bad Select',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      parameters: [
        {
          name: 'goal',
          type: 'select',
          required: false,
          defaultValue: null,
          min: null,
          max: null,
          options: [],
        },
      ],
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('returns error when parameter min > max', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Bad MinMax',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      parameters: [
        { name: 'weeks', type: 'number', required: false, defaultValue: null, min: 52, max: 4 },
      ],
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('returns error when required parameter has null defaultValue', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Bad Required',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      parameters: [
        { name: 'weeks', type: 'number', required: true, defaultValue: null, min: null, max: null },
      ],
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  // ── Validation failures ────────────────────────────────────────────────────

  it('returns error for invalid professionalProfileId (not a UUID)', async () => {
    const result = await sut.execute({
      professionalProfileId: 'not-a-uuid',
      name: 'My Template',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for invalid name (too short)', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'AB',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('returns error when name already exists for this professional', async () => {
    const professionalProfileId = generateId();

    await sut.execute({
      professionalProfileId,
      name: 'My Template',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    const result = await sut.execute({
      professionalProfileId,
      name: 'My Template',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NAME_ALREADY_EXISTS);
    }
  });

  it('allows same name for different professionals', async () => {
    await sut.execute({
      professionalProfileId: generateId(),
      name: 'My Template',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'My Template',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
  });

  it('returns error for invalid createdAtUtc (not UTC)', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'My Template',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: VALID_WORKOUT_STRUCTURE,
      createdAtUtc: '2026-02-22T10:00:00.000+03:00',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error when sessions is missing from TRAINING_PRESCRIPTION structure', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Bad Template',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      structure: { wrongKey: [] },
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE);
    }
  });

  it('returns error when meals is missing from DIET_PLAN structure', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Bad Diet',
      type: DeliverableType.DIET_PLAN,
      structure: { wrongKey: [] },
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE);
    }
  });

  it('returns error when questions is missing from PHYSIOLOGICAL_ASSESSMENT structure', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Bad Assessment',
      type: DeliverableType.PHYSIOLOGICAL_ASSESSMENT,
      structure: { wrongKey: [] },
      createdAtUtc: '2026-02-22T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE);
    }
  });
});
