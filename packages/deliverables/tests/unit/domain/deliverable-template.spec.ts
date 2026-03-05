import { describe, it, expect } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import { TemplateStatus } from '../../../domain/enums/template-status.js';
import { DeliverableType } from '../../../domain/enums/deliverable-type.js';
import { TemplateErrorCodes } from '../../../domain/errors/template-error-codes.js';
import { TemplateName } from '../../../domain/value-objects/template-name.js';
import { TemplateVersion } from '../../../domain/value-objects/template-version.js';
import { TemplateParameter } from '../../../domain/value-objects/template-parameter.js';
import { WorkoutTemplateStructure } from '../../../domain/value-objects/template-structure/workout-template-structure.js';
import { DietTemplateStructure } from '../../../domain/value-objects/template-structure/diet-template-structure.js';
import { AssessmentTemplateStructure } from '../../../domain/value-objects/template-structure/assessment-template-structure.js';
import {
  makeDeliverableTemplate,
  makeNewDeliverableTemplate,
} from '../../factories/make-deliverable-template.js';
import { DeliverableTemplate } from '../../../domain/aggregates/deliverable-template.js';
import { TemplateNotFoundError } from '../../../domain/errors/template-not-found-error.js';
import { TemplateNotActiveError } from '../../../domain/errors/template-not-active-error.js';
import { TemplateCannotBeEditedError } from '../../../domain/errors/template-cannot-be-edited-error.js';
import { TemplateNameAlreadyExistsError } from '../../../domain/errors/template-name-already-exists-error.js';
import { InvalidTemplateError } from '../../../domain/errors/invalid-template-error.js';
import { InvalidTemplateTransitionError } from '../../../domain/errors/invalid-template-transition-error.js';
import { InvalidTemplateStructureError } from '../../../domain/errors/invalid-template-structure-error.js';

// ── DeliverableTemplate aggregate ──────────────────────────────────────────────

describe('DeliverableTemplate', () => {
  // ── Creation ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates in DRAFT status at version 1', () => {
      const template = makeNewDeliverableTemplate();

      expect(template.status).toBe(TemplateStatus.DRAFT);
      expect(template.templateVersion.value).toBe(1);
      expect(template.usageCount).toBe(0);
      expect(template.previousVersionId).toBeNull();
      expect(template.activatedAtUtc).toBeNull();
      expect(template.archivedAtUtc).toBeNull();
    });

    it('does not emit domain events on creation', () => {
      const template = makeNewDeliverableTemplate();
      expect(template.getDomainEvents()).toHaveLength(0);
    });

    it('uses provided id when given', () => {
      const id = generateId();
      const template = makeNewDeliverableTemplate({ id });
      expect(template.id).toBe(id);
    });

    it('stores professionalProfileId', () => {
      const profileId = generateId();
      const template = makeNewDeliverableTemplate({ professionalProfileId: profileId });
      expect(template.professionalProfileId).toBe(profileId);
    });

    it('stores description when provided', () => {
      const template = makeNewDeliverableTemplate({ description: 'Full body strength' });
      expect(template.description).toBe('Full body strength');
    });

    it('defaults description to null when not provided', () => {
      const template = makeNewDeliverableTemplate();
      expect(template.description).toBeNull();
    });

    it('stores tags when provided', () => {
      const template = makeNewDeliverableTemplate({ tags: ['strength', 'beginner'] });
      expect(template.tags).toEqual(['strength', 'beginner']);
    });

    it('defaults tags to empty array', () => {
      const template = makeNewDeliverableTemplate();
      expect(template.tags).toHaveLength(0);
    });

    it('defaults tags to empty array when tags not provided (falsy branch)', () => {
      const nameResult = TemplateName.create('No Tags Template');
      if (nameResult.isLeft()) throw new Error();
      const structure = WorkoutTemplateStructure.create([
        {
          name: 'Day 1',
          exercises: [
            {
              catalogItemId: null,
              name: 'Push-up',
              sets: 3,
              reps: 15,
              durationSeconds: null,
              restSeconds: 30,
              notes: null,
            },
          ],
        },
      ]);
      const result = DeliverableTemplate.create({
        professionalProfileId: generateId(),
        name: nameResult.value,
        type: DeliverableType.TRAINING_PRESCRIPTION,
        structure,
        createdAtUtc: UTCDateTime.now(),
        // tags intentionally omitted to hit the `: []` defensive branch
      });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.tags).toEqual([]);
      }
    });

    it('reports isDraft() true when DRAFT', () => {
      const template = makeNewDeliverableTemplate();
      expect(template.isDraft()).toBe(true);
      expect(template.isActive()).toBe(false);
      expect(template.isArchived()).toBe(false);
      expect(template.canBeInstantiated()).toBe(false);
    });
  });

  describe('reconstitute()', () => {
    it('preserves aggregate version', () => {
      const template = makeDeliverableTemplate({ aggregateVersion: 5 });
      expect(template.version).toBe(5);
    });

    it('does not emit domain events', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
      expect(template.getDomainEvents()).toHaveLength(0);
    });
  });

  // ── update() ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates name of a DRAFT template', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
      const newNameResult = TemplateName.create('Updated Name');
      if (newNameResult.isLeft()) throw new Error('setup failed');

      const result = template.update({ name: newNameResult.value });

      expect(result.isRight()).toBe(true);
      expect(template.name.value).toBe('Updated Name');
    });

    it('updates description of a DRAFT template', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
      const result = template.update({ description: 'New description' });

      expect(result.isRight()).toBe(true);
      expect(template.description).toBe('New description');
    });

    it('updates tags of a DRAFT template', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
      const result = template.update({ tags: ['hypertrophy', 'advanced'] });

      expect(result.isRight()).toBe(true);
      expect(template.tags).toEqual(['hypertrophy', 'advanced']);
    });

    it('updates structure of a DRAFT template', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
      const newStructure = WorkoutTemplateStructure.create([
        {
          name: 'New Day',
          exercises: [
            {
              catalogItemId: null,
              name: 'Pull-up',
              sets: 3,
              reps: 8,
              durationSeconds: null,
              restSeconds: 60,
              notes: null,
            },
          ],
        },
      ]);

      const result = template.update({ structure: newStructure });

      expect(result.isRight()).toBe(true);
    });

    it('updates parameters of a DRAFT template', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
      const paramResult = TemplateParameter.create({
        name: 'weeks',
        type: 'number',
        required: false,
        defaultValue: 12,
        min: 4,
        max: 52,
        options: null,
      });
      if (paramResult.isLeft()) throw new Error('Invalid param');

      const result = template.update({ parameters: [paramResult.value] });

      expect(result.isRight()).toBe(true);
      expect(template.parameters).toHaveLength(1);
    });

    it('rejects update of ACTIVE template', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });

      const result = template.update({ description: 'New desc' });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_CANNOT_BE_EDITED);
      }
    });

    it('rejects update of ARCHIVED template', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.ARCHIVED });

      const result = template.update({ description: 'New desc' });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_CANNOT_BE_EDITED);
      }
    });
  });

  // ── activate() ───────────────────────────────────────────────────────────────

  describe('activate()', () => {
    it('transitions DRAFT → ACTIVE with valid structure', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });

      const result = template.activate();

      expect(result.isRight()).toBe(true);
      expect(template.status).toBe(TemplateStatus.ACTIVE);
      expect(template.activatedAtUtc).not.toBeNull();
      expect(template.isActive()).toBe(true);
      expect(template.canBeInstantiated()).toBe(true);
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });
      template.activate();
      expect(template.getDomainEvents()).toHaveLength(0);
    });

    it('rejects activation when already ACTIVE', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });

      const result = template.activate();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_TRANSITION);
      }
    });

    it('rejects activation when ARCHIVED', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.ARCHIVED });

      const result = template.activate();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_TRANSITION);
      }
    });

    it('rejects activation when structure is invalid (empty sessions)', () => {
      const emptyStructure = WorkoutTemplateStructure.create([]);
      const template = makeDeliverableTemplate({
        status: TemplateStatus.DRAFT,
        structure: emptyStructure,
      });

      const result = template.activate();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE);
      }
    });
  });

  // ── archive() ────────────────────────────────────────────────────────────────

  describe('archive()', () => {
    it('transitions DRAFT → ARCHIVED', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });

      const result = template.archive();

      expect(result.isRight()).toBe(true);
      expect(template.status).toBe(TemplateStatus.ARCHIVED);
      expect(template.archivedAtUtc).not.toBeNull();
      expect(template.isArchived()).toBe(true);
    });

    it('transitions ACTIVE → ARCHIVED', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });

      const result = template.archive();

      expect(result.isRight()).toBe(true);
      expect(template.status).toBe(TemplateStatus.ARCHIVED);
    });

    it('does not emit domain events', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
      template.archive();
      expect(template.getDomainEvents()).toHaveLength(0);
    });

    it('rejects archiving when already ARCHIVED', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.ARCHIVED });

      const result = template.archive();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_TRANSITION);
      }
    });

    it('reports isArchived() true and canBeInstantiated() false after archival', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.ACTIVE });
      template.archive();

      expect(template.isArchived()).toBe(true);
      expect(template.isDraft()).toBe(false);
      expect(template.isActive()).toBe(false);
      expect(template.canBeInstantiated()).toBe(false);
    });
  });

  // ── createNewVersion() ───────────────────────────────────────────────────────

  describe('createNewVersion()', () => {
    it('creates a new DRAFT template at version+1 from ACTIVE', () => {
      const activeTemplate = makeDeliverableTemplate({
        status: TemplateStatus.ACTIVE,
        version: 1,
      });

      const result = activeTemplate.createNewVersion(UTCDateTime.now());

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const newTemplate = result.value;
        expect(newTemplate.status).toBe(TemplateStatus.DRAFT);
        expect(newTemplate.templateVersion.value).toBe(2);
        expect(newTemplate.previousVersionId).toBe(activeTemplate.id);
        expect(newTemplate.usageCount).toBe(0);
        expect(newTemplate.id).not.toBe(activeTemplate.id);
      }
    });

    it('preserves name, description, structure, parameters, tags from source', () => {
      const activeTemplate = makeDeliverableTemplate({
        status: TemplateStatus.ACTIVE,
        description: 'Original description',
        tags: ['strength'],
      });

      const result = activeTemplate.createNewVersion(UTCDateTime.now());

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const newTemplate = result.value;
        expect(newTemplate.name.value).toBe(activeTemplate.name.value);
        expect(newTemplate.description).toBe('Original description');
        expect(newTemplate.tags).toEqual(['strength']);
      }
    });

    it('source template is unaffected after createNewVersion', () => {
      const activeTemplate = makeDeliverableTemplate({
        status: TemplateStatus.ACTIVE,
        version: 1,
      });
      const originalId = activeTemplate.id;

      activeTemplate.createNewVersion(UTCDateTime.now());

      expect(activeTemplate.id).toBe(originalId);
      expect(activeTemplate.status).toBe(TemplateStatus.ACTIVE);
      expect(activeTemplate.templateVersion.value).toBe(1);
    });

    it('rejects createNewVersion from DRAFT', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.DRAFT });

      const result = template.createNewVersion(UTCDateTime.now());

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_ACTIVE);
      }
    });

    it('rejects createNewVersion from ARCHIVED', () => {
      const template = makeDeliverableTemplate({ status: TemplateStatus.ARCHIVED });

      const result = template.createNewVersion(UTCDateTime.now());

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_ACTIVE);
      }
    });
  });

  // ── incrementUsage() ─────────────────────────────────────────────────────────

  describe('incrementUsage()', () => {
    it('increments usageCount from 0 to 1', () => {
      const template = makeDeliverableTemplate({ usageCount: 0 });
      template.incrementUsage();
      expect(template.usageCount).toBe(1);
    });

    it('increments usageCount multiple times', () => {
      const template = makeDeliverableTemplate({ usageCount: 5 });
      template.incrementUsage();
      template.incrementUsage();
      expect(template.usageCount).toBe(7);
    });
  });

  // ── Getters ──────────────────────────────────────────────────────────────────

  describe('getters', () => {
    it('tags getter returns a copy (caller mutations do not affect aggregate)', () => {
      const template = makeDeliverableTemplate({ tags: ['strength'] });

      const tags = template.tags as string[];
      tags.push('endurance');

      expect(template.tags).toHaveLength(1);
    });

    it('parameters getter returns a copy', () => {
      const paramResult = TemplateParameter.create({
        name: 'weeks',
        type: 'number',
        required: false,
        defaultValue: 12,
        min: null,
        max: null,
        options: null,
      });
      if (paramResult.isLeft()) throw new Error('Invalid param');
      const template = makeDeliverableTemplate();
      template.update({ parameters: [paramResult.value] });

      const params = template.parameters as TemplateParameter[];
      params.push(paramResult.value);

      expect(template.parameters).toHaveLength(1);
    });

    it('exposes all getters', () => {
      const profileId = generateId();
      const template = makeDeliverableTemplate({
        professionalProfileId: profileId,
        description: 'A description',
        tags: ['tag1'],
        version: 2,
        previousVersionId: generateId(),
      });

      expect(template.professionalProfileId).toBe(profileId);
      expect(template.description).toBe('A description');
      expect(template.tags).toEqual(['tag1']);
      expect(template.templateVersion.value).toBe(2);
      expect(template.previousVersionId).not.toBeNull();
      expect(template.createdAtUtc).toBeDefined();
      expect(template.updatedAtUtc).toBeDefined();
      expect(template.type).toBe(DeliverableType.TRAINING_PRESCRIPTION);
    });
  });
});

// ── TemplateName ──────────────────────────────────────────────────────────────

describe('TemplateName', () => {
  it('accepts a valid name', () => {
    const result = TemplateName.create('My Template');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.value).toBe('My Template');
    }
  });

  it('trims whitespace', () => {
    const result = TemplateName.create('  My Template  ');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.value).toBe('My Template');
    }
  });

  it('rejects empty string', () => {
    const result = TemplateName.create('');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('rejects whitespace-only string', () => {
    const result = TemplateName.create('   ');
    expect(result.isLeft()).toBe(true);
  });

  it('rejects name shorter than 3 characters', () => {
    const result = TemplateName.create('AB');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('rejects name longer than 100 characters', () => {
    const result = TemplateName.create('A'.repeat(101));
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    }
  });

  it('accepts name at exactly 3 characters', () => {
    const result = TemplateName.create('ABC');
    expect(result.isRight()).toBe(true);
  });

  it('accepts name at exactly 100 characters', () => {
    const result = TemplateName.create('A'.repeat(100));
    expect(result.isRight()).toBe(true);
  });
});

// ── TemplateVersion ───────────────────────────────────────────────────────────

describe('TemplateVersion', () => {
  it('creates version 1', () => {
    const result = TemplateVersion.create(1);
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.value).toBe(1);
      expect(result.value.label).toBe('v1');
    }
  });

  it('rejects version 0', () => {
    const result = TemplateVersion.create(0);
    expect(result.isLeft()).toBe(true);
  });

  it('rejects negative version', () => {
    const result = TemplateVersion.create(-1);
    expect(result.isLeft()).toBe(true);
  });

  it('rejects non-integer version', () => {
    const result = TemplateVersion.create(1.5);
    expect(result.isLeft()).toBe(true);
  });

  it('increments version', () => {
    const v1Result = TemplateVersion.create(1);
    if (v1Result.isLeft()) throw new Error('setup failed');

    const v2 = v1Result.value.increment();

    expect(v2.value).toBe(2);
    expect(v2.label).toBe('v2');
  });
});

// ── WorkoutTemplateStructure ──────────────────────────────────────────────────

describe('WorkoutTemplateStructure', () => {
  it('validates successfully with one non-empty session', () => {
    const structure = WorkoutTemplateStructure.create([
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
    ]);

    const result = structure.validate();
    expect(result.isRight()).toBe(true);
  });

  it('rejects empty sessions array', () => {
    const structure = WorkoutTemplateStructure.create([]);
    const result = structure.validate();
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE);
    }
  });

  it('rejects session with no exercises', () => {
    const structure = WorkoutTemplateStructure.create([{ name: 'Day 1', exercises: [] }]);
    const result = structure.validate();
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE);
    }
  });

  it('rejects exercise with empty name', () => {
    const structure = WorkoutTemplateStructure.create([
      {
        name: 'Day 1',
        exercises: [
          {
            catalogItemId: null,
            name: '',
            sets: 3,
            reps: 10,
            durationSeconds: null,
            restSeconds: null,
            notes: null,
          },
        ],
      },
    ]);
    const result = structure.validate();
    expect(result.isLeft()).toBe(true);
  });

  it('toSnapshot returns exercises flattened from all sessions', () => {
    const structure = WorkoutTemplateStructure.create([
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
      {
        name: 'Day 2',
        exercises: [
          {
            catalogItemId: null,
            name: 'Deadlift',
            sets: 4,
            reps: 5,
            durationSeconds: null,
            restSeconds: 120,
            notes: 'Keep back straight',
          },
        ],
      },
    ]);

    const snapshot = structure.toSnapshot();

    expect(snapshot.type).toBe(DeliverableType.TRAINING_PRESCRIPTION);
    expect(snapshot.exercises).toHaveLength(2);
    expect(snapshot.exercises[0]?.name).toBe('Squat');
    expect(snapshot.exercises[1]?.name).toBe('Deadlift');
  });

  it('getSessions returns a copy', () => {
    const structure = WorkoutTemplateStructure.create([
      {
        name: 'Day 1',
        exercises: [
          {
            catalogItemId: null,
            name: 'Squat',
            sets: 3,
            reps: 10,
            durationSeconds: null,
            restSeconds: null,
            notes: null,
          },
        ],
      },
    ]);
    const sessions = structure.getSessions();
    sessions.push({ name: 'Extra', exercises: [] });
    expect(structure.getSessions()).toHaveLength(1);
  });
});

// ── DietTemplateStructure ─────────────────────────────────────────────────────

describe('DietTemplateStructure', () => {
  it('validates successfully with one named meal', () => {
    const structure = DietTemplateStructure.create([
      {
        name: 'Breakfast',
        time: '08:00',
        foods: [{ catalogItemId: null, name: 'Oats', quantity: '100g', notes: null }],
      },
    ]);

    const result = structure.validate();
    expect(result.isRight()).toBe(true);
  });

  it('rejects empty meals array', () => {
    const structure = DietTemplateStructure.create([]);
    const result = structure.validate();
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE);
    }
  });

  it('rejects meal with empty name', () => {
    const structure = DietTemplateStructure.create([{ name: '', time: null, foods: [] }]);
    const result = structure.validate();
    expect(result.isLeft()).toBe(true);
  });

  it('toSnapshot returns DIET_PLAN type with empty exercises', () => {
    const structure = DietTemplateStructure.create([
      {
        name: 'Lunch',
        time: null,
        foods: [{ catalogItemId: null, name: 'Rice', quantity: '150g', notes: null }],
      },
    ]);

    const snapshot = structure.toSnapshot();

    expect(snapshot.type).toBe(DeliverableType.DIET_PLAN);
    expect(snapshot.exercises).toHaveLength(0);
    expect(snapshot.description).toContain('Lunch');
  });

  it('getMeals returns a copy', () => {
    const structure = DietTemplateStructure.create([{ name: 'Breakfast', time: null, foods: [] }]);
    const meals = structure.getMeals();
    meals.push({ name: 'Dinner', time: null, foods: [] });
    expect(structure.getMeals()).toHaveLength(1);
  });
});

// ── AssessmentTemplateStructure ───────────────────────────────────────────────

describe('AssessmentTemplateStructure', () => {
  it('validates successfully with one question', () => {
    const structure = AssessmentTemplateStructure.create([
      {
        key: 'weight',
        label: 'Current Weight (kg)',
        type: 'number',
        required: true,
        options: null,
      },
    ]);

    const result = structure.validate();
    expect(result.isRight()).toBe(true);
  });

  it('rejects empty questions array', () => {
    const structure = AssessmentTemplateStructure.create([]);
    const result = structure.validate();
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE);
    }
  });

  it('rejects question with empty key', () => {
    const structure = AssessmentTemplateStructure.create([
      { key: '', label: 'Weight', type: 'number', required: true, options: null },
    ]);
    const result = structure.validate();
    expect(result.isLeft()).toBe(true);
  });

  it('rejects question with empty label', () => {
    const structure = AssessmentTemplateStructure.create([
      { key: 'weight', label: '', type: 'number', required: true, options: null },
    ]);
    const result = structure.validate();
    expect(result.isLeft()).toBe(true);
  });

  it('rejects select question with no options', () => {
    const structure = AssessmentTemplateStructure.create([
      { key: 'goal', label: 'Goal', type: 'select', required: true, options: null },
    ]);
    const result = structure.validate();
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE);
    }
  });

  it('validates select question with options', () => {
    const structure = AssessmentTemplateStructure.create([
      {
        key: 'goal',
        label: 'Goal',
        type: 'select',
        required: true,
        options: ['lose weight', 'gain muscle'],
      },
    ]);
    const result = structure.validate();
    expect(result.isRight()).toBe(true);
  });

  it('toSnapshot returns PHYSIOLOGICAL_ASSESSMENT type with empty exercises', () => {
    const structure = AssessmentTemplateStructure.create([
      { key: 'weight', label: 'Weight', type: 'number', required: true, options: null },
    ]);

    const snapshot = structure.toSnapshot();

    expect(snapshot.type).toBe(DeliverableType.PHYSIOLOGICAL_ASSESSMENT);
    expect(snapshot.exercises).toHaveLength(0);
    expect(snapshot.description).toContain('1 question');
  });

  it('getQuestions returns a copy', () => {
    const structure = AssessmentTemplateStructure.create([
      { key: 'weight', label: 'Weight', type: 'number', required: true, options: null },
    ]);
    const questions = structure.getQuestions();
    questions.push({ key: 'extra', label: 'Extra', type: 'text', required: false, options: null });
    expect(structure.getQuestions()).toHaveLength(1);
  });

  it('getQuestions returns defensive copies of options arrays', () => {
    const structure = AssessmentTemplateStructure.create([
      {
        key: 'goal',
        label: 'Goal',
        type: 'select',
        required: true,
        options: ['strength', 'endurance'],
      },
    ]);
    const questions = structure.getQuestions();
    expect(questions[0]?.options).toEqual(['strength', 'endurance']);
    // Mutating the returned options should not affect the structure
    (questions[0]?.options as string[])?.push('speed');
    expect(structure.getQuestions()[0]?.options).toHaveLength(2);
  });
});

// ── TemplateParameter ─────────────────────────────────────────────────────────

describe('TemplateParameter', () => {
  it('creates a number parameter', () => {
    const result = TemplateParameter.create({
      name: 'weeks',
      type: 'number',
      required: false,
      defaultValue: 12,
      min: 4,
      max: 52,
      options: null,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const param = result.value;
      expect(param.name).toBe('weeks');
      expect(param.type).toBe('number');
      expect(param.required).toBe(false);
      expect(param.defaultValue).toBe(12);
      expect(param.min).toBe(4);
      expect(param.max).toBe(52);
      expect(param.options).toBeNull();
    }
  });

  it('creates a select parameter with options', () => {
    const result = TemplateParameter.create({
      name: 'goal',
      type: 'select',
      required: true,
      defaultValue: 'strength',
      min: null,
      max: null,
      options: ['strength', 'endurance'],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.type).toBe('select');
      expect(result.value.options).toEqual(['strength', 'endurance']);
    }
  });

  it('options getter returns a copy', () => {
    const result = TemplateParameter.create({
      name: 'goal',
      type: 'select',
      required: false,
      defaultValue: null,
      min: null,
      max: null,
      options: ['a', 'b'],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const opts = result.value.options as string[];
      opts.push('c');
      expect(result.value.options).toHaveLength(2);
    }
  });
});

// ── Error classes ─────────────────────────────────────────────────────────────

describe('TemplateNotFoundError', () => {
  it('has correct code and message', () => {
    const id = generateId();
    const err = new TemplateNotFoundError(id);
    expect(err.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_FOUND);
    expect(err.message).toContain(id);
  });
});

describe('TemplateNotActiveError', () => {
  it('has correct code and message', () => {
    const id = generateId();
    const err = new TemplateNotActiveError(id);
    expect(err.code).toBe(TemplateErrorCodes.TEMPLATE_NOT_ACTIVE);
    expect(err.message).toContain(id);
  });
});

describe('TemplateCannotBeEditedError', () => {
  it('has correct code and message', () => {
    const id = generateId();
    const err = new TemplateCannotBeEditedError(id);
    expect(err.code).toBe(TemplateErrorCodes.TEMPLATE_CANNOT_BE_EDITED);
    expect(err.message).toContain(id);
  });
});

describe('TemplateNameAlreadyExistsError', () => {
  it('has correct code and message', () => {
    const err = new TemplateNameAlreadyExistsError();
    expect(err.code).toBe(TemplateErrorCodes.TEMPLATE_NAME_ALREADY_EXISTS);
    expect(err.message).toContain('already exists');
  });
});

describe('InvalidTemplateError', () => {
  it('has correct code and message', () => {
    const err = new InvalidTemplateError('name too short');
    expect(err.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE);
    expect(err.message).toContain('name too short');
  });
});

describe('InvalidTemplateTransitionError', () => {
  it('has correct code and message', () => {
    const err = new InvalidTemplateTransitionError(TemplateStatus.ARCHIVED, TemplateStatus.ACTIVE);
    expect(err.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_TRANSITION);
    expect(err.message).toContain('ARCHIVED');
    expect(err.message).toContain('ACTIVE');
  });
});

describe('InvalidTemplateStructureError', () => {
  it('has correct code and message', () => {
    const err = new InvalidTemplateStructureError('sessions array is empty');
    expect(err.code).toBe(TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE);
    expect(err.message).toContain('sessions array is empty');
  });
});
