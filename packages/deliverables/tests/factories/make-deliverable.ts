import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { Deliverable } from '../../domain/aggregates/deliverable.js';
import { DeliverableTitle } from '../../domain/value-objects/deliverable-title.js';
import { DeliverableType } from '../../domain/enums/deliverable-type.js';
import { DeliverableStatus } from '../../domain/enums/deliverable-status.js';
import { ExerciseAssignment } from '../../domain/entities/exercise-assignment.js';
import type { DeliverableProps } from '../../domain/aggregates/deliverable.js';

type DeliverableOverrides = Partial<{
  id: string;
  professionalProfileId: string;
  title: DeliverableTitle;
  type: DeliverableType;
  status: DeliverableStatus;
  contentVersion: number;
  description: string | null;
  exercises: ExerciseAssignment[];
  logicalDay: LogicalDay;
  timezoneUsed: string;
  version: number;
  activatedAtUtc: UTCDateTime | null;
  archivedAtUtc: UTCDateTime | null;
}>;

/**
 * Test factory for Deliverable — uses `reconstitute` to allow setting any status.
 *
 * Defaults to a DRAFT TRAINING_PRESCRIPTION Deliverable with no exercises.
 */
export function makeDeliverable(overrides: DeliverableOverrides = {}): Deliverable {
  const titleResult = DeliverableTitle.create(
    overrides.title ? overrides.title.value : 'Test Program',
  );
  if (titleResult.isLeft()) throw new Error(`makeDeliverable: invalid title`);

  const logicalDayResult = overrides.logicalDay ?? LogicalDay.create('2026-02-22');
  const logicalDay =
    logicalDayResult instanceof LogicalDay
      ? logicalDayResult
      : (() => {
          if ('isLeft' in logicalDayResult && logicalDayResult.isLeft()) {
            throw new Error('makeDeliverable: invalid logicalDay');
          }
          return (logicalDayResult as { value: LogicalDay }).value;
        })();

  const props: DeliverableProps = {
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    title: overrides.title ?? titleResult.value,
    type: overrides.type ?? DeliverableType.TRAINING_PRESCRIPTION,
    status: overrides.status ?? DeliverableStatus.DRAFT,
    contentVersion: overrides.contentVersion ?? 1,
    description: overrides.description !== undefined ? overrides.description : null,
    exercises: overrides.exercises ?? [],
    logicalDay,
    timezoneUsed: overrides.timezoneUsed ?? 'America/Sao_Paulo',
    createdAtUtc: UTCDateTime.now(),
    activatedAtUtc: overrides.activatedAtUtc !== undefined ? overrides.activatedAtUtc : null,
    archivedAtUtc: overrides.archivedAtUtc !== undefined ? overrides.archivedAtUtc : null,
  };

  return Deliverable.reconstitute(overrides.id ?? generateId(), props, overrides.version ?? 0);
}

/**
 * Creates a newly-created DRAFT Deliverable via the domain factory.
 */
export function makeNewDeliverable(
  overrides: Partial<{
    id: string;
    professionalProfileId: string;
    title: string;
    type: DeliverableType;
    description: string | null;
    timezoneUsed: string;
  }> = {},
): Deliverable {
  const titleResult = DeliverableTitle.create(overrides.title ?? 'Test Program');
  if (titleResult.isLeft()) throw new Error(`makeNewDeliverable: ${titleResult.value.message}`);

  const logicalDayResult = LogicalDay.create('2026-02-22');
  if ('isLeft' in logicalDayResult && logicalDayResult.isLeft()) {
    throw new Error('makeNewDeliverable: invalid logicalDay');
  }
  const logicalDay = (logicalDayResult as { value: LogicalDay }).value;

  const result = Deliverable.create({
    ...(overrides.id !== undefined ? { id: overrides.id } : {}),
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    title: titleResult.value,
    type: overrides.type ?? DeliverableType.TRAINING_PRESCRIPTION,
    description: overrides.description ?? null,
    createdAtUtc: UTCDateTime.now(),
    logicalDay,
    timezoneUsed: overrides.timezoneUsed ?? 'America/Sao_Paulo',
  });

  if (result.isLeft()) throw new Error(`makeNewDeliverable: ${result.value.message}`);
  return result.value;
}

/**
 * Creates a single ExerciseAssignment for use in test scenarios.
 */
export function makeExerciseAssignment(
  overrides: Partial<{
    id: string;
    name: string;
    sets: number | null;
    reps: number | null;
    durationSeconds: number | null;
    restSeconds: number | null;
    notes: string | null;
    orderIndex: number;
    catalogItemId: string | null;
    catalogVersion: number | null;
    snapshotCreatedAtUtc: string | null;
    category: string | null;
    muscleGroups: string[] | null;
    instructions: string | null;
    mediaUrl: string | null;
  }> = {},
): ExerciseAssignment {
  return ExerciseAssignment.create(
    {
      catalogItemId: overrides.catalogItemId ?? null,
      catalogVersion: overrides.catalogVersion ?? null,
      snapshotCreatedAtUtc: overrides.snapshotCreatedAtUtc ?? null,
      name: overrides.name ?? 'Squat',
      category: overrides.category ?? null,
      muscleGroups: overrides.muscleGroups ?? null,
      instructions: overrides.instructions ?? null,
      mediaUrl: overrides.mediaUrl ?? null,
      sets: overrides.sets !== undefined ? overrides.sets : 3,
      reps: overrides.reps !== undefined ? overrides.reps : 10,
      durationSeconds: overrides.durationSeconds ?? null,
      restSeconds: overrides.restSeconds !== undefined ? overrides.restSeconds : 60,
      notes: overrides.notes ?? null,
      orderIndex: overrides.orderIndex ?? 0,
    },
    overrides.id,
  );
}
