import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { DeliverableStatus } from '../../../domain/enums/deliverable-status.js';
import { DeliverableType } from '../../../domain/enums/deliverable-type.js';
import { DeliverableErrorCodes } from '../../../domain/errors/deliverable-error-codes.js';
import { ExerciseAssignment } from '../../../domain/entities/exercise-assignment.js';
import {
  makeDeliverable,
  makeNewDeliverable,
  makeExerciseAssignment,
} from '../../factories/make-deliverable.js';

describe('Deliverable', () => {
  // ── Creation ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates in DRAFT status with contentVersion 1', () => {
      const deliverable = makeNewDeliverable();

      expect(deliverable.status).toBe(DeliverableStatus.DRAFT);
      expect(deliverable.contentVersion).toBe(1);
      expect(deliverable.exercises).toHaveLength(0);
      expect(deliverable.activatedAtUtc).toBeNull();
      expect(deliverable.archivedAtUtc).toBeNull();
    });

    it('does not emit domain events on creation', () => {
      const deliverable = makeNewDeliverable();
      expect(deliverable.getDomainEvents()).toHaveLength(0);
    });

    it('uses provided id when given', () => {
      const id = generateId();
      const deliverable = makeNewDeliverable({ id });
      expect(deliverable.id).toBe(id);
    });

    it('stores professionalProfileId', () => {
      const profileId = generateId();
      const deliverable = makeNewDeliverable({ professionalProfileId: profileId });
      expect(deliverable.professionalProfileId).toBe(profileId);
    });

    it('stores type', () => {
      const deliverable = makeNewDeliverable({ type: DeliverableType.DIET_PLAN });
      expect(deliverable.type).toBe(DeliverableType.DIET_PLAN);
    });

    it('stores description when provided', () => {
      const deliverable = makeNewDeliverable({ description: 'Full body strength program' });
      expect(deliverable.description).toBe('Full body strength program');
    });

    it('defaults description to null when not provided', () => {
      const deliverable = makeNewDeliverable();
      expect(deliverable.description).toBeNull();
    });

    it('starts with empty exercises list', () => {
      const deliverable = makeNewDeliverable();
      expect(deliverable.exercises).toHaveLength(0);
    });

    it('stores timezoneUsed', () => {
      const deliverable = makeNewDeliverable({ timezoneUsed: 'America/New_York' });
      expect(deliverable.timezoneUsed).toBe('America/New_York');
    });

    it('reports isDraft() true when DRAFT', () => {
      const deliverable = makeNewDeliverable();
      expect(deliverable.isDraft()).toBe(true);
      expect(deliverable.isActive()).toBe(false);
      expect(deliverable.isArchived()).toBe(false);
    });
  });

  describe('reconstitute()', () => {
    it('preserves version', () => {
      const deliverable = makeDeliverable({ version: 7 });
      expect(deliverable.version).toBe(7);
    });

    it('does not emit domain events', () => {
      const deliverable = makeDeliverable({ status: DeliverableStatus.ACTIVE });
      expect(deliverable.getDomainEvents()).toHaveLength(0);
    });
  });

  // ── DeliverableTitle value object ──────────────────────────────────────────

  describe('DeliverableTitle', () => {
    it('accepts a valid title', () => {
      const deliverable = makeNewDeliverable({ title: 'Strength Program A' });
      expect(deliverable.title.value).toBe('Strength Program A');
    });

    it('trims whitespace from title', () => {
      const deliverable = makeNewDeliverable({ title: '  Upper Body  ' });
      expect(deliverable.title.value).toBe('Upper Body');
    });
  });

  // ── addExercise (DRAFT only, ADR-0011 §3) ─────────────────────────────────

  describe('addExercise()', () => {
    it('adds exercise to DRAFT deliverable', () => {
      const deliverable = makeNewDeliverable();

      const result = deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'Squat',
        sets: 3,
        reps: 10,
        durationSeconds: null,
        restSeconds: 60,
        notes: null,
      });

      expect(result.isRight()).toBe(true);
      expect(deliverable.exercises).toHaveLength(1);
    });

    it('increments contentVersion on each add', () => {
      const deliverable = makeNewDeliverable();

      deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'Squat',
        sets: 3,
        reps: 10,
        durationSeconds: null,
        restSeconds: null,
        notes: null,
      });

      deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'Bench Press',
        sets: 3,
        reps: 8,
        durationSeconds: null,
        restSeconds: null,
        notes: null,
      });

      // Started at 1, +1 per add = 3
      expect(deliverable.contentVersion).toBe(3);
      expect(deliverable.exercises).toHaveLength(2);
    });

    it('assigns contiguous orderIndex to exercises', () => {
      const deliverable = makeNewDeliverable();

      deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'A',
        sets: null,
        reps: null,
        durationSeconds: null,
        restSeconds: null,
        notes: null,
      });
      deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'B',
        sets: null,
        reps: null,
        durationSeconds: null,
        restSeconds: null,
        notes: null,
      });

      const [first, second] = deliverable.exercises;
      expect(first?.orderIndex).toBe(0);
      expect(second?.orderIndex).toBe(1);
    });

    it('stores catalog traceability fields when provided (ADR-0011 §4)', () => {
      const deliverable = makeNewDeliverable();
      const catalogItemId = generateId();

      const result = deliverable.addExercise({
        catalogItemId,
        catalogVersion: 3,
        snapshotCreatedAtUtc: new Date().toISOString(),
        name: 'Deadlift',
        sets: 3,
        reps: 5,
        durationSeconds: null,
        restSeconds: 120,
        notes: 'Keep back straight',
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.catalogItemId).toBe(catalogItemId);
        expect(result.value.catalogVersion).toBe(3);
      }
    });

    it('rejects addExercise when status is ACTIVE (content locked)', () => {
      const deliverable = makeDeliverable({ status: DeliverableStatus.ACTIVE });

      const result = deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'Squat',
        sets: 3,
        reps: 10,
        durationSeconds: null,
        restSeconds: null,
        notes: null,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(DeliverableErrorCodes.DELIVERABLE_NOT_DRAFT);
      }
    });

    it('rejects addExercise when status is ARCHIVED', () => {
      const deliverable = makeDeliverable({ status: DeliverableStatus.ARCHIVED });

      const result = deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'Squat',
        sets: null,
        reps: null,
        durationSeconds: null,
        restSeconds: null,
        notes: null,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(DeliverableErrorCodes.DELIVERABLE_NOT_DRAFT);
      }
    });
  });

  // ── removeExercise (DRAFT only) ────────────────────────────────────────────

  describe('removeExercise()', () => {
    it('removes an exercise from DRAFT deliverable', () => {
      const deliverable = makeNewDeliverable();

      const addResult = deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'Squat',
        sets: 3,
        reps: 10,
        durationSeconds: null,
        restSeconds: null,
        notes: null,
      });
      if (addResult.isLeft()) throw new Error('setup failed');

      const exerciseId = addResult.value.id;
      const removeResult = deliverable.removeExercise(exerciseId);

      expect(removeResult.isRight()).toBe(true);
      expect(deliverable.exercises).toHaveLength(0);
    });

    it('reindexes remaining exercises after removal', () => {
      const deliverable = makeNewDeliverable();

      const r1 = deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'A',
        sets: null,
        reps: null,
        durationSeconds: null,
        restSeconds: null,
        notes: null,
      });
      const r2 = deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'B',
        sets: null,
        reps: null,
        durationSeconds: null,
        restSeconds: null,
        notes: null,
      });
      const r3 = deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'C',
        sets: null,
        reps: null,
        durationSeconds: null,
        restSeconds: null,
        notes: null,
      });

      if (r1.isLeft() || r2.isLeft() || r3.isLeft()) throw new Error('setup failed');

      // Remove middle exercise B
      deliverable.removeExercise(r2.value.id);

      expect(deliverable.exercises).toHaveLength(2);
      expect(deliverable.exercises[0]?.orderIndex).toBe(0);
      expect(deliverable.exercises[1]?.orderIndex).toBe(1);
    });

    it('increments contentVersion on removal', () => {
      const deliverable = makeNewDeliverable();
      const addResult = deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'Squat',
        sets: null,
        reps: null,
        durationSeconds: null,
        restSeconds: null,
        notes: null,
      });
      if (addResult.isLeft()) throw new Error('setup failed');

      const versionBeforeRemove = deliverable.contentVersion;
      deliverable.removeExercise(addResult.value.id);

      expect(deliverable.contentVersion).toBe(versionBeforeRemove + 1);
    });

    it('returns ExerciseNotFoundError for unknown id', () => {
      const deliverable = makeNewDeliverable();

      const result = deliverable.removeExercise(generateId());

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(DeliverableErrorCodes.EXERCISE_NOT_FOUND);
      }
    });

    it('rejects removeExercise when ACTIVE (content locked)', () => {
      const exercise = makeExerciseAssignment();
      const deliverable = makeDeliverable({
        status: DeliverableStatus.ACTIVE,
        exercises: [exercise],
      });

      const result = deliverable.removeExercise(exercise.id);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(DeliverableErrorCodes.DELIVERABLE_NOT_DRAFT);
      }
    });

    it('rejects removeExercise when ARCHIVED', () => {
      const exercise = makeExerciseAssignment();
      const deliverable = makeDeliverable({
        status: DeliverableStatus.ARCHIVED,
        exercises: [exercise],
      });

      const result = deliverable.removeExercise(exercise.id);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(DeliverableErrorCodes.DELIVERABLE_NOT_DRAFT);
      }
    });
  });

  // ── activate() (ADR-0008, ADR-0011 §3) ───────────────────────────────────

  describe('activate()', () => {
    it('transitions DRAFT → ACTIVE for PROGRAM with exercises', () => {
      const deliverable = makeDeliverable({
        status: DeliverableStatus.DRAFT,
        type: DeliverableType.TRAINING_PRESCRIPTION,
        exercises: [makeExerciseAssignment()],
      });

      const result = deliverable.activate();

      expect(result.isRight()).toBe(true);
      expect(deliverable.status).toBe(DeliverableStatus.ACTIVE);
      expect(deliverable.activatedAtUtc).not.toBeNull();
    });

    it('transitions DRAFT → ACTIVE for DIET_PLAN (no exercises required)', () => {
      const deliverable = makeDeliverable({
        status: DeliverableStatus.DRAFT,
        type: DeliverableType.DIET_PLAN,
        exercises: [],
      });

      const result = deliverable.activate();

      expect(result.isRight()).toBe(true);
      expect(deliverable.status).toBe(DeliverableStatus.ACTIVE);
    });

    it('transitions DRAFT → ACTIVE for ASSESSMENT_TEMPLATE (no exercises required)', () => {
      const deliverable = makeDeliverable({
        status: DeliverableStatus.DRAFT,
        type: DeliverableType.PHYSIOLOGICAL_ASSESSMENT,
        exercises: [],
      });

      const result = deliverable.activate();

      expect(result.isRight()).toBe(true);
      expect(deliverable.status).toBe(DeliverableStatus.ACTIVE);
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const deliverable = makeDeliverable({
        status: DeliverableStatus.DRAFT,
        type: DeliverableType.DIET_PLAN,
      });
      deliverable.activate();
      expect(deliverable.getDomainEvents()).toHaveLength(0);
    });

    it('rejects activation of PROGRAM with no exercises', () => {
      const deliverable = makeDeliverable({
        status: DeliverableStatus.DRAFT,
        type: DeliverableType.TRAINING_PRESCRIPTION,
        exercises: [],
      });

      const result = deliverable.activate();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(DeliverableErrorCodes.EMPTY_EXERCISE_LIST);
      }
    });

    it('rejects activation when already ACTIVE', () => {
      const deliverable = makeDeliverable({ status: DeliverableStatus.ACTIVE });

      const result = deliverable.activate();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(DeliverableErrorCodes.INVALID_DELIVERABLE_TRANSITION);
      }
    });

    it('rejects activation when ARCHIVED (terminal)', () => {
      const deliverable = makeDeliverable({ status: DeliverableStatus.ARCHIVED });

      const result = deliverable.activate();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(DeliverableErrorCodes.INVALID_DELIVERABLE_TRANSITION);
      }
    });

    it('locks content after activation (addExercise rejected)', () => {
      const deliverable = makeDeliverable({
        status: DeliverableStatus.DRAFT,
        type: DeliverableType.DIET_PLAN,
      });
      deliverable.activate();

      const result = deliverable.addExercise({
        catalogItemId: null,
        catalogVersion: null,
        snapshotCreatedAtUtc: null,
        name: 'Push up',
        sets: null,
        reps: null,
        durationSeconds: null,
        restSeconds: null,
        notes: null,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(DeliverableErrorCodes.DELIVERABLE_NOT_DRAFT);
      }
    });

    it('reports isActive() true after activation', () => {
      const deliverable = makeDeliverable({
        status: DeliverableStatus.DRAFT,
        type: DeliverableType.DIET_PLAN,
      });
      deliverable.activate();

      expect(deliverable.isActive()).toBe(true);
      expect(deliverable.isDraft()).toBe(false);
      expect(deliverable.isArchived()).toBe(false);
    });
  });

  // ── archive() (ADR-0008) ──────────────────────────────────────────────────

  describe('archive()', () => {
    it('transitions DRAFT → ARCHIVED', () => {
      const deliverable = makeDeliverable({ status: DeliverableStatus.DRAFT });

      const result = deliverable.archive();

      expect(result.isRight()).toBe(true);
      expect(deliverable.status).toBe(DeliverableStatus.ARCHIVED);
      expect(deliverable.archivedAtUtc).not.toBeNull();
    });

    it('transitions ACTIVE → ARCHIVED', () => {
      const deliverable = makeDeliverable({ status: DeliverableStatus.ACTIVE });

      const result = deliverable.archive();

      expect(result.isRight()).toBe(true);
      expect(deliverable.status).toBe(DeliverableStatus.ARCHIVED);
    });

    it('does not emit domain events', () => {
      const deliverable = makeDeliverable({ status: DeliverableStatus.ACTIVE });
      deliverable.archive();
      expect(deliverable.getDomainEvents()).toHaveLength(0);
    });

    it('rejects archive when already ARCHIVED (terminal)', () => {
      const deliverable = makeDeliverable({ status: DeliverableStatus.ARCHIVED });

      const result = deliverable.archive();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(DeliverableErrorCodes.INVALID_DELIVERABLE_TRANSITION);
      }
    });

    it('reports isArchived() true after archival', () => {
      const deliverable = makeDeliverable({ status: DeliverableStatus.DRAFT });
      deliverable.archive();

      expect(deliverable.isArchived()).toBe(true);
      expect(deliverable.isDraft()).toBe(false);
      expect(deliverable.isActive()).toBe(false);
    });
  });

  // ── Getters ────────────────────────────────────────────────────────────────

  describe('getters', () => {
    it('exercises getter returns a copy (caller mutations do not affect aggregate)', () => {
      const exercise = makeExerciseAssignment();
      const deliverable = makeDeliverable({
        status: DeliverableStatus.DRAFT,
        exercises: [exercise],
      });

      const exercises = deliverable.exercises as ExerciseAssignment[];
      exercises.push(makeExerciseAssignment());

      // Internal state is unaffected
      expect(deliverable.exercises).toHaveLength(1);
    });

    it('exposes all fields via getters', () => {
      const profileId = generateId();
      const deliverable = makeDeliverable({
        professionalProfileId: profileId,
        type: DeliverableType.PHYSIOLOGICAL_ASSESSMENT,
        description: 'Full body assessment',
      });

      expect(deliverable.professionalProfileId).toBe(profileId);
      expect(deliverable.type).toBe(DeliverableType.PHYSIOLOGICAL_ASSESSMENT);
      expect(deliverable.description).toBe('Full body assessment');
      expect(deliverable.logicalDay).toBeDefined();
      expect(deliverable.timezoneUsed).toBeDefined();
      expect(deliverable.createdAtUtc).toBeDefined();
    });
  });
});

// ── Error classes ──────────────────────────────────────────────────────────────

import { DeliverableNotFoundError } from '../../../domain/errors/deliverable-not-found-error.js';
import { DeliverableNotActiveError } from '../../../domain/errors/deliverable-not-active-error.js';
import { DeliverableNotDraftError } from '../../../domain/errors/deliverable-not-draft-error.js';
import { EmptyExerciseListError } from '../../../domain/errors/empty-exercise-list-error.js';
import { ExerciseNotFoundError } from '../../../domain/errors/exercise-not-found-error.js';
import { InvalidDeliverableError } from '../../../domain/errors/invalid-deliverable-error.js';
import { InvalidDeliverableTransitionError } from '../../../domain/errors/invalid-deliverable-transition-error.js';
import { DeliverableTitle } from '../../../domain/value-objects/deliverable-title.js';

describe('DeliverableNotFoundError', () => {
  it('has correct code and message', () => {
    const id = generateId();
    const err = new DeliverableNotFoundError(id);
    expect(err.code).toBe(DeliverableErrorCodes.DELIVERABLE_NOT_FOUND);
    expect(err.message).toContain(id);
  });
});

describe('DeliverableNotActiveError', () => {
  it('has correct code and message', () => {
    const id = generateId();
    const err = new DeliverableNotActiveError(id);
    expect(err.code).toBe(DeliverableErrorCodes.DELIVERABLE_NOT_ACTIVE);
    expect(err.message).toContain(id);
  });
});

describe('DeliverableNotDraftError', () => {
  it('has correct code and message', () => {
    const id = generateId();
    const err = new DeliverableNotDraftError(id);
    expect(err.code).toBe(DeliverableErrorCodes.DELIVERABLE_NOT_DRAFT);
    expect(err.message).toContain(id);
  });
});

describe('EmptyExerciseListError', () => {
  it('has correct code and message', () => {
    const id = generateId();
    const err = new EmptyExerciseListError(id);
    expect(err.code).toBe(DeliverableErrorCodes.EMPTY_EXERCISE_LIST);
    expect(err.message).toContain(id);
  });
});

describe('ExerciseNotFoundError', () => {
  it('has correct code and message', () => {
    const id = generateId();
    const err = new ExerciseNotFoundError(id);
    expect(err.code).toBe(DeliverableErrorCodes.EXERCISE_NOT_FOUND);
    expect(err.message).toContain(id);
  });
});

describe('InvalidDeliverableError', () => {
  it('has correct code and message', () => {
    const err = new InvalidDeliverableError('title is too long');
    expect(err.code).toBe(DeliverableErrorCodes.INVALID_DELIVERABLE);
    expect(err.message).toContain('title is too long');
  });
});

describe('InvalidDeliverableTransitionError', () => {
  it('has correct code and message', () => {
    const err = new InvalidDeliverableTransitionError(
      DeliverableStatus.ARCHIVED,
      DeliverableStatus.ACTIVE,
    );
    expect(err.code).toBe(DeliverableErrorCodes.INVALID_DELIVERABLE_TRANSITION);
    expect(err.message).toContain('ARCHIVED');
    expect(err.message).toContain('ACTIVE');
  });
});

describe('DeliverableTitle', () => {
  it('rejects empty title', () => {
    const result = DeliverableTitle.create('');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(DeliverableErrorCodes.INVALID_DELIVERABLE);
    }
  });

  it('rejects whitespace-only title', () => {
    const result = DeliverableTitle.create('   ');
    expect(result.isLeft()).toBe(true);
  });

  it('rejects title longer than 120 characters', () => {
    const longTitle = 'A'.repeat(121);
    const result = DeliverableTitle.create(longTitle);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(DeliverableErrorCodes.INVALID_DELIVERABLE);
    }
  });

  it('accepts title at exactly 120 characters', () => {
    const result = DeliverableTitle.create('A'.repeat(120));
    expect(result.isRight()).toBe(true);
  });

  it('accepts a minimal 1-character title', () => {
    const result = DeliverableTitle.create('A');
    expect(result.isRight()).toBe(true);
  });
});

describe('ExerciseAssignment', () => {
  it('exposes all snapshot getters', () => {
    const exercise = makeExerciseAssignment({
      name: 'Plank',
      sets: 3,
      reps: 10,
      durationSeconds: 30,
      restSeconds: 60,
      notes: 'Keep core tight',
    });

    expect(exercise.name).toBe('Plank');
    expect(exercise.sets).toBe(3);
    expect(exercise.reps).toBe(10);
    expect(exercise.durationSeconds).toBe(30);
    expect(exercise.restSeconds).toBe(60);
    expect(exercise.notes).toBe('Keep core tight');
  });

  it('reconstitutes from persistence with all props', () => {
    const id = generateId();
    const exercise = ExerciseAssignment.reconstitute(id, {
      catalogItemId: null,
      catalogVersion: null,
      snapshotCreatedAtUtc: null,
      name: 'Dead Hang',
      category: null,
      muscleGroups: null,
      instructions: null,
      mediaUrl: null,
      sets: null,
      reps: null,
      durationSeconds: 45,
      restSeconds: null,
      notes: null,
      orderIndex: 2,
    });

    expect(exercise.id).toBe(id);
    expect(exercise.name).toBe('Dead Hang');
    expect(exercise.durationSeconds).toBe(45);
    expect(exercise.orderIndex).toBe(2);
  });

  it('defaults orderIndex to 0 when not provided (covers ?? 0 branch)', () => {
    const exercise = ExerciseAssignment.create({
      catalogItemId: null,
      catalogVersion: null,
      snapshotCreatedAtUtc: null,
      name: 'Push-up',
      sets: null,
      reps: null,
      durationSeconds: null,
      restSeconds: null,
      notes: null,
    });

    expect(exercise.orderIndex).toBe(0);
  });

  it('exposes catalog snapshot getters with non-null values (ADR-0011 §2)', () => {
    const exercise = ExerciseAssignment.create({
      catalogItemId: 'cat-1',
      catalogVersion: 2,
      snapshotCreatedAtUtc: '2026-02-23T00:00:00.000Z',
      name: 'Bench Press',
      category: 'STRENGTH',
      muscleGroups: ['CHEST', 'TRICEPS'],
      instructions: 'Lie flat on bench, lower bar to chest',
      mediaUrl: 'https://example.com/bench-press.mp4',
      sets: 3,
      reps: 10,
      durationSeconds: null,
      restSeconds: 90,
      notes: null,
    });

    expect(exercise.category).toBe('STRENGTH');
    expect(exercise.muscleGroups).toEqual(['CHEST', 'TRICEPS']);
    expect(exercise.instructions).toBe('Lie flat on bench, lower bar to chest');
    expect(exercise.mediaUrl).toBe('https://example.com/bench-press.mp4');
  });

  it('returns null for catalog snapshot getters when fields are omitted', () => {
    const exercise = ExerciseAssignment.create({
      catalogItemId: null,
      catalogVersion: null,
      snapshotCreatedAtUtc: null,
      name: 'Push-up',
      sets: null,
      reps: null,
      durationSeconds: null,
      restSeconds: null,
      notes: null,
      // category, muscleGroups, instructions, mediaUrl omitted → null defaults
    });

    expect(exercise.category).toBeNull();
    expect(exercise.muscleGroups).toBeNull();
    expect(exercise.instructions).toBeNull();
    expect(exercise.mediaUrl).toBeNull();
  });

  it('muscleGroups getter returns a defensive copy (non-null branch)', () => {
    const exercise = ExerciseAssignment.create({
      catalogItemId: null,
      catalogVersion: null,
      snapshotCreatedAtUtc: null,
      name: 'Row',
      muscleGroups: ['BACK', 'BICEPS'],
      sets: null,
      reps: null,
      durationSeconds: null,
      restSeconds: null,
      notes: null,
    });

    const copy = exercise.muscleGroups as string[];
    copy.push('SHOULDERS');

    expect(exercise.muscleGroups).toEqual(['BACK', 'BICEPS']);
  });
});
