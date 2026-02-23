import { describe, it, expect } from 'vitest';
import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { AssessmentResponse } from '../../../domain/aggregates/assessment-response.js';
import { AssessmentFieldResponse } from '../../../domain/entities/assessment-field-response.js';
import { TemplateFieldType } from '../../../domain/enums/template-field-type.js';
import {
  numberFieldValue,
  textFieldValue,
  booleanFieldValue,
  selectFieldValue,
  isNumberFieldValue,
  isTextFieldValue,
  isBooleanFieldValue,
  isSelectFieldValue,
  fieldValueMatchesType,
} from '../../../domain/value-objects/field-value.js';
import { AssessmentErrorCodes } from '../../../domain/errors/assessment-error-codes.js';
import { makeAssessmentResponse } from '../../factories/make-assessment-response.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeLogicalDay(v = '2026-02-22'): LogicalDay {
  const r = LogicalDay.create(v);
  if (r.isLeft()) throw new Error('invalid test logicalDay');
  return r.value;
}

// ── FieldValue discriminated union ────────────────────────────────────────────

describe('FieldValue factory functions', () => {
  it('numberFieldValue creates a NUMBER variant', () => {
    const v = numberFieldValue(75.5);
    expect(v).toEqual({ type: 'NUMBER', value: 75.5 });
  });

  it('textFieldValue creates a TEXT variant', () => {
    const v = textFieldValue('Excellent');
    expect(v).toEqual({ type: 'TEXT', value: 'Excellent' });
  });

  it('booleanFieldValue creates a BOOLEAN variant', () => {
    expect(booleanFieldValue(true)).toEqual({ type: 'BOOLEAN', value: true });
    expect(booleanFieldValue(false)).toEqual({ type: 'BOOLEAN', value: false });
  });

  it('selectFieldValue creates a SELECT variant', () => {
    const v = selectFieldValue('Good');
    expect(v).toEqual({ type: 'SELECT', value: 'Good' });
  });
});

describe('FieldValue type guards', () => {
  it('isNumberFieldValue returns true only for NUMBER', () => {
    expect(isNumberFieldValue(numberFieldValue(1))).toBe(true);
    expect(isNumberFieldValue(textFieldValue('x'))).toBe(false);
    expect(isNumberFieldValue(booleanFieldValue(true))).toBe(false);
    expect(isNumberFieldValue(selectFieldValue('x'))).toBe(false);
  });

  it('isTextFieldValue returns true only for TEXT', () => {
    expect(isTextFieldValue(textFieldValue('x'))).toBe(true);
    expect(isTextFieldValue(numberFieldValue(1))).toBe(false);
    expect(isTextFieldValue(booleanFieldValue(true))).toBe(false);
    expect(isTextFieldValue(selectFieldValue('x'))).toBe(false);
  });

  it('isBooleanFieldValue returns true only for BOOLEAN', () => {
    expect(isBooleanFieldValue(booleanFieldValue(true))).toBe(true);
    expect(isBooleanFieldValue(numberFieldValue(1))).toBe(false);
    expect(isBooleanFieldValue(textFieldValue('x'))).toBe(false);
    expect(isBooleanFieldValue(selectFieldValue('x'))).toBe(false);
  });

  it('isSelectFieldValue returns true only for SELECT', () => {
    expect(isSelectFieldValue(selectFieldValue('x'))).toBe(true);
    expect(isSelectFieldValue(numberFieldValue(1))).toBe(false);
    expect(isSelectFieldValue(textFieldValue('x'))).toBe(false);
    expect(isSelectFieldValue(booleanFieldValue(true))).toBe(false);
  });
});

describe('fieldValueMatchesType', () => {
  it('returns true when value type matches the expected TemplateFieldType', () => {
    expect(fieldValueMatchesType(numberFieldValue(1), TemplateFieldType.NUMBER)).toBe(true);
    expect(fieldValueMatchesType(textFieldValue('x'), TemplateFieldType.TEXT)).toBe(true);
    expect(fieldValueMatchesType(booleanFieldValue(true), TemplateFieldType.BOOLEAN)).toBe(true);
    expect(fieldValueMatchesType(selectFieldValue('x'), TemplateFieldType.SELECT)).toBe(true);
  });

  it('returns false when value type does not match', () => {
    expect(fieldValueMatchesType(numberFieldValue(1), TemplateFieldType.TEXT)).toBe(false);
    expect(fieldValueMatchesType(textFieldValue('x'), TemplateFieldType.NUMBER)).toBe(false);
    expect(fieldValueMatchesType(booleanFieldValue(true), TemplateFieldType.SELECT)).toBe(false);
    expect(fieldValueMatchesType(selectFieldValue('x'), TemplateFieldType.BOOLEAN)).toBe(false);
  });
});

// ── AssessmentResponse.create ─────────────────────────────────────────────────

describe('AssessmentResponse.create', () => {
  const baseProps = {
    executionId: generateId(),
    deliverableId: generateId(),
    professionalProfileId: generateId(),
    clientId: generateId(),
    timezoneUsed: 'America/Sao_Paulo',
  };

  it('creates an immutable response with all fields stored', () => {
    const fieldId = generateId();
    const result = AssessmentResponse.create({
      ...baseProps,
      logicalDay: makeLogicalDay(),
      responses: [{ fieldId, value: numberFieldValue(75) }],
      createdAtUtc: UTCDateTime.now(),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const r = result.value;
      expect(r.executionId).toBe(baseProps.executionId);
      expect(r.deliverableId).toBe(baseProps.deliverableId);
      expect(r.professionalProfileId).toBe(baseProps.professionalProfileId);
      expect(r.clientId).toBe(baseProps.clientId);
      expect(r.timezoneUsed).toBe('America/Sao_Paulo');
      expect(r.logicalDay.value).toBe('2026-02-22');
      expect(r.responseCount).toBe(1);
      expect(r.createdAtUtc.toISO()).toMatch(/Z$/);
    }
  });

  it('uses the provided id when given', () => {
    const id = generateId();
    const result = AssessmentResponse.create({
      id,
      ...baseProps,
      logicalDay: makeLogicalDay(),
      responses: [{ fieldId: generateId(), value: numberFieldValue(1) }],
      createdAtUtc: UTCDateTime.now(),
    });

    if (result.isRight()) expect(result.value.id).toBe(id);
  });

  it('generates an id when not provided', () => {
    const result = AssessmentResponse.create({
      ...baseProps,
      logicalDay: makeLogicalDay(),
      responses: [{ fieldId: generateId(), value: numberFieldValue(1) }],
      createdAtUtc: UTCDateTime.now(),
    });

    if (result.isRight()) expect(result.value.id.length).toBeGreaterThan(0);
  });

  it('accepts multiple responses of different types', () => {
    const result = AssessmentResponse.create({
      ...baseProps,
      logicalDay: makeLogicalDay(),
      responses: [
        { fieldId: generateId(), value: numberFieldValue(75) },
        { fieldId: generateId(), value: textFieldValue('notes here') },
        { fieldId: generateId(), value: booleanFieldValue(true) },
        { fieldId: generateId(), value: selectFieldValue('Good') },
      ],
      createdAtUtc: UTCDateTime.now(),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.responseCount).toBe(4);
  });

  it('returns InvalidAssessmentResponseError when responses is empty', () => {
    const result = AssessmentResponse.create({
      ...baseProps,
      logicalDay: makeLogicalDay(),
      responses: [],
      createdAtUtc: UTCDateTime.now(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_RESPONSE);
    }
  });

  it('returns DuplicateFieldResponseError when a fieldId appears twice', () => {
    const fieldId = generateId();
    const result = AssessmentResponse.create({
      ...baseProps,
      logicalDay: makeLogicalDay(),
      responses: [
        { fieldId, value: numberFieldValue(75) },
        { fieldId, value: numberFieldValue(80) },
      ],
      createdAtUtc: UTCDateTime.now(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.DUPLICATE_FIELD_RESPONSE);
    }
  });
});

// ── AssessmentResponse.reconstitute ──────────────────────────────────────────

describe('AssessmentResponse.reconstitute', () => {
  it('restores state from persisted props and version', () => {
    const response = makeAssessmentResponse({ version: 3 });
    expect(response.version).toBe(3);
    expect(response.responseCount).toBeGreaterThan(0);
  });
});

// ── AssessmentResponse.findResponseForField ───────────────────────────────────

describe('AssessmentResponse.findResponseForField', () => {
  it('returns the field response when found', () => {
    const fieldId = generateId();
    const result = AssessmentResponse.create({
      executionId: generateId(),
      deliverableId: generateId(),
      professionalProfileId: generateId(),
      clientId: generateId(),
      logicalDay: makeLogicalDay(),
      timezoneUsed: 'UTC',
      responses: [{ fieldId, value: numberFieldValue(90) }],
      createdAtUtc: UTCDateTime.now(),
    });

    if (result.isLeft()) throw new Error('setup failed');
    const response = result.value;

    const found = response.findResponseForField(fieldId);
    expect(found).toBeDefined();
    expect(found!.fieldId).toBe(fieldId);
    expect(found!.value).toEqual(numberFieldValue(90));
  });

  it('returns undefined when the fieldId was not answered', () => {
    const response = makeAssessmentResponse();

    expect(response.findResponseForField(generateId())).toBeUndefined();
  });
});

// ── AssessmentResponse.responseCount ─────────────────────────────────────────

describe('AssessmentResponse.responseCount', () => {
  it('returns the number of field responses', () => {
    const f1 = generateId();
    const f2 = generateId();
    const result = AssessmentResponse.create({
      executionId: generateId(),
      deliverableId: generateId(),
      professionalProfileId: generateId(),
      clientId: generateId(),
      logicalDay: makeLogicalDay(),
      timezoneUsed: 'UTC',
      responses: [
        { fieldId: f1, value: numberFieldValue(75) },
        { fieldId: f2, value: textFieldValue('Good') },
      ],
      createdAtUtc: UTCDateTime.now(),
    });

    if (result.isRight()) expect(result.value.responseCount).toBe(2);
  });
});

// ── AssessmentResponse.responses getter: defensive copy ───────────────────────

describe('AssessmentResponse.responses getter', () => {
  it('returns a copy — external mutation does not affect the aggregate', () => {
    const response = makeAssessmentResponse();
    const copy = response.responses as ReturnType<typeof response.responses.slice>;
    // @ts-expect-error — intentional mutation of the copy
    copy.push(undefined);

    expect(response.responses.length).toBe(1);
  });
});

// ── AssessmentFieldResponse.reconstitute ──────────────────────────────────────

describe('AssessmentFieldResponse.reconstitute', () => {
  it('restores a field response from persisted props', () => {
    const id = generateId();
    const fieldId = generateId();

    const fieldResponse = AssessmentFieldResponse.reconstitute(id, {
      fieldId,
      value: numberFieldValue(90),
    });

    expect(fieldResponse.id).toBe(id);
    expect(fieldResponse.fieldId).toBe(fieldId);
    expect(fieldResponse.value).toEqual(numberFieldValue(90));
  });
});
