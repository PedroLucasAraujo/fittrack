import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { AssessmentResponse } from '../../domain/aggregates/assessment-response.js';
import type { AssessmentResponseProps } from '../../domain/aggregates/assessment-response.js';
import { AssessmentFieldResponse } from '../../domain/entities/assessment-field-response.js';
import { numberFieldValue } from '../../domain/value-objects/field-value.js';

// ── Internal helpers ──────────────────────────────────────────────────────────

function makeDefaultLogicalDay(): LogicalDay {
  const result = LogicalDay.create('2026-02-22');
  if (result.isLeft()) throw new Error('makeAssessmentResponse: invalid default logicalDay');
  return result.value;
}

function makeDefaultFieldResponse(fieldId: string): AssessmentFieldResponse {
  return AssessmentFieldResponse.create({
    fieldId,
    value: numberFieldValue(75),
  });
}

// ── Public factories ──────────────────────────────────────────────────────────

/**
 * Creates an AssessmentResponse via `reconstitute` for tests that need
 * arbitrary pre-existing state.
 *
 * Defaults: one NUMBER response (fieldId = generated), all IDs generated.
 * AssessmentResponse is immutable after creation — there is no "pending" state.
 */
export function makeAssessmentResponse(
  overrides: Partial<AssessmentResponseProps> & { id?: string; version?: number } = {},
): AssessmentResponse {
  const { id, version, ...propOverrides } = overrides;

  const defaultFieldId = generateId();
  const defaultFields = [makeDefaultFieldResponse(defaultFieldId)];

  const props: AssessmentResponseProps = {
    executionId: generateId(),
    deliverableId: generateId(),
    professionalProfileId: generateId(),
    clientId: generateId(),
    logicalDay: makeDefaultLogicalDay(),
    timezoneUsed: 'America/Sao_Paulo',
    responses: defaultFields,
    createdAtUtc: UTCDateTime.now(),
    ...propOverrides,
  };

  return AssessmentResponse.reconstitute(id ?? generateId(), props, version ?? 0);
}

/**
 * Creates a new AssessmentResponse via the domain factory (`AssessmentResponse.create`).
 * Use when testing the creation path (RecordAssessmentResponse use case).
 *
 * Defaults: one NUMBER response for a generated fieldId.
 */
export function makeNewAssessmentResponse(
  overrides: Partial<{
    id: string;
    executionId: string;
    deliverableId: string;
    professionalProfileId: string;
    clientId: string;
    logicalDay: string;
    timezoneUsed: string;
    responses: Array<{ fieldId: string; value: ReturnType<typeof numberFieldValue> }>;
    createdAtUtc: string;
  }> = {},
): AssessmentResponse {
  const logicalDayResult = LogicalDay.create(overrides.logicalDay ?? '2026-02-22');
  if (logicalDayResult.isLeft()) {
    throw new Error(
      `makeNewAssessmentResponse: invalid logicalDay — ${logicalDayResult.value.message}`,
    );
  }

  const createdAtUtcResult = UTCDateTime.fromISO(
    overrides.createdAtUtc ?? '2026-02-22T10:00:00.000Z',
  );
  if (createdAtUtcResult.isLeft()) {
    throw new Error(
      `makeNewAssessmentResponse: invalid createdAtUtc — ${createdAtUtcResult.value.message}`,
    );
  }

  const defaultFieldId = generateId();
  const defaultResponses = [{ fieldId: defaultFieldId, value: numberFieldValue(75) }];

  const result = AssessmentResponse.create({
    ...(overrides.id !== undefined ? { id: overrides.id } : {}),
    executionId: overrides.executionId ?? generateId(),
    deliverableId: overrides.deliverableId ?? generateId(),
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    clientId: overrides.clientId ?? generateId(),
    logicalDay: logicalDayResult.value,
    timezoneUsed: overrides.timezoneUsed ?? 'America/Sao_Paulo',
    responses: overrides.responses ?? defaultResponses,
    createdAtUtc: createdAtUtcResult.value,
  });

  if (result.isLeft()) throw new Error(`makeNewAssessmentResponse: ${result.value.message}`);
  return result.value;
}
