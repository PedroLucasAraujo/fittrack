import { generateId, UTCDateTime } from '@fittrack/core';
import { DeliverableTemplate } from '../../domain/aggregates/deliverable-template.js';
import type { DeliverableTemplateProps } from '../../domain/aggregates/deliverable-template.js';
import { TemplateName } from '../../domain/value-objects/template-name.js';
import { TemplateVersion } from '../../domain/value-objects/template-version.js';
import { TemplateStatus } from '../../domain/enums/template-status.js';
import { DeliverableType } from '../../domain/enums/deliverable-type.js';
import { WorkoutTemplateStructure } from '../../domain/value-objects/template-structure/workout-template-structure.js';
import type { ITemplateStructure } from '../../domain/value-objects/template-structure/i-template-structure.js';

type TemplateOverrides = Partial<{
  id: string;
  professionalProfileId: string;
  name: TemplateName;
  description: string | null;
  type: DeliverableType;
  status: TemplateStatus;
  version: number;
  aggregateVersion: number;
  structure: ITemplateStructure;
  usageCount: number;
  tags: string[];
  previousVersionId: string | null;
  activatedAtUtc: UTCDateTime | null;
  archivedAtUtc: UTCDateTime | null;
}>;

/**
 * Default workout structure used by the factory when none is provided.
 */
function makeDefaultStructure(): WorkoutTemplateStructure {
  return WorkoutTemplateStructure.create([
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
}

/**
 * Test factory for DeliverableTemplate — uses `reconstitute` to allow setting any status.
 *
 * Defaults to a DRAFT TRAINING_PRESCRIPTION template with one workout session.
 */
export function makeDeliverableTemplate(overrides: TemplateOverrides = {}): DeliverableTemplate {
  const nameResult = TemplateName.create(overrides.name ? overrides.name.value : 'Test Template');
  if (nameResult.isLeft()) throw new Error(`makeDeliverableTemplate: invalid name`);

  const versionResult = TemplateVersion.create(overrides.version ?? 1);
  if (versionResult.isLeft()) throw new Error(`makeDeliverableTemplate: invalid version`);

  const now = UTCDateTime.now();

  const props: DeliverableTemplateProps = {
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    name: overrides.name ?? nameResult.value,
    description: overrides.description !== undefined ? overrides.description : null,
    type: overrides.type ?? DeliverableType.TRAINING_PRESCRIPTION,
    status: overrides.status ?? TemplateStatus.DRAFT,
    version: versionResult.value,
    previousVersionId:
      overrides.previousVersionId !== undefined ? overrides.previousVersionId : null,
    structure: overrides.structure ?? makeDefaultStructure(),
    parameters: [],
    usageCount: overrides.usageCount ?? 0,
    tags: overrides.tags ?? [],
    createdAtUtc: now,
    updatedAtUtc: now,
    activatedAtUtc: overrides.activatedAtUtc !== undefined ? overrides.activatedAtUtc : null,
    archivedAtUtc: overrides.archivedAtUtc !== undefined ? overrides.archivedAtUtc : null,
  };

  return DeliverableTemplate.reconstitute(
    overrides.id ?? generateId(),
    props,
    overrides.aggregateVersion ?? 0,
  );
}

/**
 * Creates a new DRAFT DeliverableTemplate via the domain factory.
 */
export function makeNewDeliverableTemplate(
  overrides: Partial<{
    id: string;
    professionalProfileId: string;
    name: string;
    description: string | null;
    structure: ITemplateStructure;
    tags: string[];
  }> = {},
): DeliverableTemplate {
  const nameResult = TemplateName.create(overrides.name ?? 'Test Template');
  if (nameResult.isLeft())
    throw new Error(`makeNewDeliverableTemplate: ${nameResult.value.message}`);

  const result = DeliverableTemplate.create({
    ...(overrides.id !== undefined ? { id: overrides.id } : {}),
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    name: nameResult.value,
    description: overrides.description ?? null,
    type: DeliverableType.TRAINING_PRESCRIPTION,
    structure: overrides.structure ?? makeDefaultStructure(),
    tags: overrides.tags ?? [],
    createdAtUtc: UTCDateTime.now(),
  });

  if (result.isLeft()) throw new Error(`makeNewDeliverableTemplate: ${result.value.message}`);
  return result.value;
}
