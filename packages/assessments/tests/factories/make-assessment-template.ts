import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { AssessmentTemplate } from '../../domain/aggregates/assessment-template.js';
import type { AssessmentTemplateProps } from '../../domain/aggregates/assessment-template.js';
import { AssessmentTemplateStatus } from '../../domain/enums/assessment-template-status.js';
import { TemplateFieldType } from '../../domain/enums/template-field-type.js';
import { AssessmentTemplateTitle } from '../../domain/value-objects/assessment-template-title.js';
import { TemplateFieldLabel } from '../../domain/value-objects/template-field-label.js';
import { AssessmentTemplateField } from '../../domain/entities/assessment-template-field.js';

// ── Internal helpers ──────────────────────────────────────────────────────────

function makeDefaultTitle(): AssessmentTemplateTitle {
  const result = AssessmentTemplateTitle.create('Body Composition Assessment');
  if (result.isLeft()) throw new Error('makeAssessmentTemplate: invalid default title');
  return result.value;
}

function makeDefaultField(fieldId?: string): AssessmentTemplateField {
  const labelResult = TemplateFieldLabel.create('Weight');
  if (labelResult.isLeft()) throw new Error('makeAssessmentTemplate: invalid default field label');
  return AssessmentTemplateField.create(
    {
      label: labelResult.value,
      fieldType: TemplateFieldType.NUMBER,
      unit: 'kg',
      required: true,
      options: null,
      orderIndex: 0,
    },
    fieldId,
  );
}

function makeDefaultLogicalDay(): LogicalDay {
  const result = LogicalDay.create('2026-02-22');
  if (result.isLeft()) throw new Error('makeAssessmentTemplate: invalid default logicalDay');
  return result.value;
}

// ── Public factories ──────────────────────────────────────────────────────────

/**
 * Creates an AssessmentTemplate via `reconstitute` for tests that need
 * arbitrary state (DRAFT, ACTIVE, ARCHIVED).
 *
 * Defaults: DRAFT with one required NUMBER field ("Weight / kg").
 */
export function makeAssessmentTemplate(
  overrides: Partial<AssessmentTemplateProps> & { id?: string; version?: number } = {},
): AssessmentTemplate {
  const { id, version, ...propOverrides } = overrides;

  const props: AssessmentTemplateProps = {
    professionalProfileId: generateId(),
    title: makeDefaultTitle(),
    description: null,
    status: AssessmentTemplateStatus.DRAFT,
    fields: [makeDefaultField()],
    contentVersion: 1,
    logicalDay: makeDefaultLogicalDay(),
    timezoneUsed: 'America/Sao_Paulo',
    createdAtUtc: UTCDateTime.now(),
    activatedAtUtc: null,
    archivedAtUtc: null,
    ...propOverrides,
  };

  return AssessmentTemplate.reconstitute(id ?? generateId(), props, version ?? 0);
}

/**
 * Convenience factory for an ACTIVE AssessmentTemplate (fields locked).
 */
export function makeActiveAssessmentTemplate(
  overrides: Partial<AssessmentTemplateProps> & { id?: string; version?: number } = {},
): AssessmentTemplate {
  return makeAssessmentTemplate({
    status: AssessmentTemplateStatus.ACTIVE,
    activatedAtUtc: UTCDateTime.now(),
    ...overrides,
  });
}

/**
 * Convenience factory for an ARCHIVED AssessmentTemplate (terminal state).
 */
export function makeArchivedAssessmentTemplate(
  overrides: Partial<AssessmentTemplateProps> & { id?: string; version?: number } = {},
): AssessmentTemplate {
  return makeAssessmentTemplate({
    status: AssessmentTemplateStatus.ARCHIVED,
    archivedAtUtc: UTCDateTime.now(),
    ...overrides,
  });
}

/**
 * Creates a new AssessmentTemplate via the domain factory (`AssessmentTemplate.create`).
 * Always starts in DRAFT with no fields — mirrors the creation use case path.
 * Use this when testing the creation path specifically.
 */
export function makeNewAssessmentTemplate(
  overrides: Partial<{
    professionalProfileId: string;
    title: string;
    description: string | null;
    timezoneUsed: string;
  }> = {},
): AssessmentTemplate {
  const titleResult = AssessmentTemplateTitle.create(
    overrides.title ?? 'Body Composition Assessment',
  );
  if (titleResult.isLeft()) {
    throw new Error(`makeNewAssessmentTemplate: invalid title — ${titleResult.value.message}`);
  }

  const tz = overrides.timezoneUsed ?? 'America/Sao_Paulo';
  const createdAtUtc = UTCDateTime.now();
  const logicalDayResult = LogicalDay.fromDate(createdAtUtc.value, tz);
  if (logicalDayResult.isLeft()) {
    throw new Error(
      `makeNewAssessmentTemplate: invalid timezoneUsed — ${logicalDayResult.value.message}`,
    );
  }

  const result = AssessmentTemplate.create({
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    title: titleResult.value,
    description: overrides.description ?? null,
    createdAtUtc,
    logicalDay: logicalDayResult.value,
    timezoneUsed: tz,
  });

  if (result.isLeft()) throw new Error(`makeNewAssessmentTemplate: ${result.value.message}`);
  return result.value;
}
