import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, LogicalDay } from '@fittrack/core';
import { CompareAssessmentResponses } from '../../../application/use-cases/compare-assessment-responses.js';
import { InMemoryAssessmentResponseRepository } from '../../repositories/in-memory-assessment-response-repository.js';
import { AssessmentErrorCodes } from '../../../domain/errors/assessment-error-codes.js';
import { makeAssessmentResponse } from '../../factories/make-assessment-response.js';
import { AssessmentFieldResponse } from '../../../domain/entities/assessment-field-response.js';
import {
  numberFieldValue,
  textFieldValue,
  booleanFieldValue,
} from '../../../domain/value-objects/field-value.js';

function makeDay(v: string): LogicalDay {
  const r = LogicalDay.create(v);
  if (r.isLeft()) throw new Error('invalid test logicalDay');
  return r.value;
}

function makeResponseWithFields(
  shared: { professionalProfileId: string; clientId: string; logicalDay: string },
  fields: Array<{
    fieldId: string;
    value: ReturnType<typeof numberFieldValue | typeof textFieldValue | typeof booleanFieldValue>;
  }>,
) {
  const responses = fields.map((f) =>
    AssessmentFieldResponse.create({ fieldId: f.fieldId, value: f.value }),
  );
  return makeAssessmentResponse({
    professionalProfileId: shared.professionalProfileId,
    clientId: shared.clientId,
    logicalDay: makeDay(shared.logicalDay),
    responses,
  });
}

describe('CompareAssessmentResponses', () => {
  let repository: InMemoryAssessmentResponseRepository;
  let sut: CompareAssessmentResponses;

  beforeEach(() => {
    repository = new InMemoryAssessmentResponseRepository();
    sut = new CompareAssessmentResponses(repository);
  });

  // ── Happy path: field comparisons ────────────────────────────────────────────

  it('produces fieldComparisons for fields present in both responses', async () => {
    const professionalProfileId = generateId();
    const clientId = generateId();
    const sharedFieldId = generateId();

    const baseline = makeResponseWithFields(
      { professionalProfileId, clientId, logicalDay: '2026-01-01' },
      [{ fieldId: sharedFieldId, value: numberFieldValue(70) }],
    );
    const current = makeResponseWithFields(
      { professionalProfileId, clientId, logicalDay: '2026-02-01' },
      [{ fieldId: sharedFieldId, value: numberFieldValue(75) }],
    );

    repository.items.push(baseline, current);

    const result = await sut.execute({
      professionalProfileId,
      baselineResponseId: baseline.id,
      currentResponseId: current.id,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const out = result.value;
      expect(out.baselineResponseId).toBe(baseline.id);
      expect(out.currentResponseId).toBe(current.id);
      expect(out.baselineLogicalDay).toBe('2026-01-01');
      expect(out.currentLogicalDay).toBe('2026-02-01');
      expect(out.fieldComparisons).toHaveLength(1);

      const comparison = out.fieldComparisons[0]!;
      expect(comparison.fieldId).toBe(sharedFieldId);
      expect(comparison.baseline).toEqual(numberFieldValue(70));
      expect(comparison.current).toEqual(numberFieldValue(75));
      expect(comparison.numericDelta).toBe(5);
      expect(comparison.changed).toBe(true);
    }
  });

  it('reports unchanged: false when values are equal', async () => {
    const professionalProfileId = generateId();
    const fieldId = generateId();

    const baseline = makeResponseWithFields(
      { professionalProfileId, clientId: generateId(), logicalDay: '2026-01-01' },
      [{ fieldId, value: numberFieldValue(70) }],
    );
    const current = makeResponseWithFields(
      { professionalProfileId, clientId: generateId(), logicalDay: '2026-02-01' },
      [{ fieldId, value: numberFieldValue(70) }], // same value
    );

    repository.items.push(baseline, current);

    const result = await sut.execute({
      professionalProfileId,
      baselineResponseId: baseline.id,
      currentResponseId: current.id,
    });

    if (result.isRight()) {
      expect(result.value.fieldComparisons[0]!.changed).toBe(false);
      expect(result.value.fieldComparisons[0]!.numericDelta).toBe(0);
    }
  });

  it('does not compute numericDelta for non-NUMBER fields', async () => {
    const professionalProfileId = generateId();
    const fieldId = generateId();

    const baseline = makeResponseWithFields(
      { professionalProfileId, clientId: generateId(), logicalDay: '2026-01-01' },
      [{ fieldId, value: textFieldValue('Good') }],
    );
    const current = makeResponseWithFields(
      { professionalProfileId, clientId: generateId(), logicalDay: '2026-02-01' },
      [{ fieldId, value: textFieldValue('Excellent') }],
    );

    repository.items.push(baseline, current);

    const result = await sut.execute({
      professionalProfileId,
      baselineResponseId: baseline.id,
      currentResponseId: current.id,
    });

    if (result.isRight()) {
      expect(result.value.fieldComparisons[0]!.numericDelta).toBeNull();
      expect(result.value.fieldComparisons[0]!.changed).toBe(true);
    }
  });

  it('identifies newFieldIds — fields in current but absent from baseline', async () => {
    const professionalProfileId = generateId();
    const newFieldId = generateId();

    const baseline = makeAssessmentResponse({ professionalProfileId });
    const current = makeResponseWithFields(
      { professionalProfileId, clientId: generateId(), logicalDay: '2026-02-01' },
      [
        // include baseline's field too
        { fieldId: baseline.responses[0]!.fieldId, value: numberFieldValue(70) },
        { fieldId: newFieldId, value: booleanFieldValue(true) },
      ],
    );

    repository.items.push(baseline, current);

    const result = await sut.execute({
      professionalProfileId,
      baselineResponseId: baseline.id,
      currentResponseId: current.id,
    });

    if (result.isRight()) {
      expect(result.value.newFieldIds).toContain(newFieldId);
    }
  });

  it('identifies removedFieldIds — fields in baseline but absent from current', async () => {
    const professionalProfileId = generateId();
    const removedFieldId = generateId();

    const baseline = makeResponseWithFields(
      { professionalProfileId, clientId: generateId(), logicalDay: '2026-01-01' },
      [{ fieldId: removedFieldId, value: numberFieldValue(80) }],
    );
    const current = makeAssessmentResponse({ professionalProfileId });
    // current does not include removedFieldId

    repository.items.push(baseline, current);

    const result = await sut.execute({
      professionalProfileId,
      baselineResponseId: baseline.id,
      currentResponseId: current.id,
    });

    if (result.isRight()) {
      expect(result.value.removedFieldIds).toContain(removedFieldId);
    }
  });

  it('sorts fieldComparisons by fieldId for deterministic output', async () => {
    const professionalProfileId = generateId();
    // Use fixed IDs to control sort order
    const fieldA = 'aaa-field';
    const fieldB = 'bbb-field';
    const fieldC = 'ccc-field';

    const baseline = makeResponseWithFields(
      { professionalProfileId, clientId: generateId(), logicalDay: '2026-01-01' },
      [
        { fieldId: fieldC, value: numberFieldValue(1) },
        { fieldId: fieldA, value: numberFieldValue(2) },
        { fieldId: fieldB, value: numberFieldValue(3) },
      ],
    );
    const current = makeResponseWithFields(
      { professionalProfileId, clientId: generateId(), logicalDay: '2026-02-01' },
      [
        { fieldId: fieldB, value: numberFieldValue(4) },
        { fieldId: fieldC, value: numberFieldValue(5) },
        { fieldId: fieldA, value: numberFieldValue(6) },
      ],
    );

    repository.items.push(baseline, current);

    const result = await sut.execute({
      professionalProfileId,
      baselineResponseId: baseline.id,
      currentResponseId: current.id,
    });

    if (result.isRight()) {
      const ids = result.value.fieldComparisons.map((c) => c.fieldId);
      expect(ids).toEqual([fieldA, fieldB, fieldC]);
    }
  });

  // ── Error paths ─────────────────────────────────────────────────────────────

  it('returns AssessmentResponseNotFoundError when baseline does not exist', async () => {
    const current = makeAssessmentResponse();
    repository.items.push(current);

    const result = await sut.execute({
      professionalProfileId: current.professionalProfileId,
      baselineResponseId: generateId(),
      currentResponseId: current.id,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_RESPONSE_NOT_FOUND);
    }
  });

  it('returns AssessmentResponseNotFoundError when current does not exist', async () => {
    const baseline = makeAssessmentResponse();
    repository.items.push(baseline);

    const result = await sut.execute({
      professionalProfileId: baseline.professionalProfileId,
      baselineResponseId: baseline.id,
      currentResponseId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_RESPONSE_NOT_FOUND);
    }
  });

  it('returns AssessmentResponseNotFoundError when baseline belongs to a different professional (ADR-0025)', async () => {
    const professionalA = generateId();
    const baseline = makeAssessmentResponse({ professionalProfileId: professionalA });
    const current = makeAssessmentResponse({ professionalProfileId: professionalA });
    repository.items.push(baseline, current);

    const result = await sut.execute({
      professionalProfileId: generateId(), // professionalB — neither owner
      baselineResponseId: baseline.id,
      currentResponseId: current.id,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_RESPONSE_NOT_FOUND);
    }
  });

  it('returns AssessmentResponseNotFoundError when current belongs to a different professional (ADR-0025)', async () => {
    const professionalProfileId = generateId();
    const baseline = makeAssessmentResponse({ professionalProfileId });
    const current = makeAssessmentResponse(); // different professionalProfileId
    repository.items.push(baseline, current);

    const result = await sut.execute({
      professionalProfileId,
      baselineResponseId: baseline.id,
      currentResponseId: current.id,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_RESPONSE_NOT_FOUND);
    }
  });
});
