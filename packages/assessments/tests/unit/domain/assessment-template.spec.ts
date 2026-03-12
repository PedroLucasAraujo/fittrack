import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { AssessmentTemplate } from '../../../domain/aggregates/assessment-template.js';
import { AssessmentTemplateStatus } from '../../../domain/enums/assessment-template-status.js';
import { TemplateFieldType } from '../../../domain/enums/template-field-type.js';
import { AssessmentTemplateTitle } from '../../../domain/value-objects/assessment-template-title.js';
import { TemplateFieldLabel } from '../../../domain/value-objects/template-field-label.js';
import { AssessmentErrorCodes } from '../../../domain/errors/assessment-error-codes.js';
import { AssessmentTemplateField } from '../../../domain/entities/assessment-template-field.js';
import { AssessmentTemplateNotActiveError } from '../../../domain/errors/assessment-template-not-active-error.js';
import {
  makeAssessmentTemplate,
  makeActiveAssessmentTemplate,
  makeArchivedAssessmentTemplate,
} from '../../factories/make-assessment-template.js';

// ── Inline helpers ────────────────────────────────────────────────────────────

function makeTitle(v = 'Body Composition'): AssessmentTemplateTitle {
  const r = AssessmentTemplateTitle.create(v);
  if (r.isLeft()) throw new Error('invalid test title');
  return r.value;
}

function makeLabel(v = 'Weight'): TemplateFieldLabel {
  const r = TemplateFieldLabel.create(v);
  if (r.isLeft()) throw new Error('invalid test label');
  return r.value;
}

function makeLogicalDay(v = '2026-02-22'): LogicalDay {
  const r = LogicalDay.create(v);
  if (r.isLeft()) throw new Error('invalid test logicalDay');
  return r.value;
}

function makeTemplate(): AssessmentTemplate {
  const r = AssessmentTemplate.create({
    professionalProfileId: generateId(),
    title: makeTitle(),
    description: null,
    createdAtUtc: UTCDateTime.now(),
    logicalDay: makeLogicalDay(),
    timezoneUsed: 'America/Sao_Paulo',
  });
  if (r.isLeft()) throw new Error('failed to create AssessmentTemplate');
  return r.value;
}

function addNumberField(template: AssessmentTemplate, label = 'Weight', fieldId?: string) {
  return template.addField(
    {
      label: makeLabel(label),
      fieldType: TemplateFieldType.NUMBER,
      unit: 'kg',
      required: true,
      options: null,
    },
    fieldId,
  );
}

// ── AssessmentTemplateTitle value object ──────────────────────────────────────

describe('AssessmentTemplateTitle', () => {
  it('creates a valid title and trims whitespace', () => {
    const r = AssessmentTemplateTitle.create('  Body Composition  ');
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe('Body Composition');
  });

  it('rejects an empty string', () => {
    const r = AssessmentTemplateTitle.create('');
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE);
  });

  it('rejects a whitespace-only string', () => {
    const r = AssessmentTemplateTitle.create('   ');
    expect(r.isLeft()).toBe(true);
  });

  it('accepts a title of exactly 120 characters', () => {
    expect(AssessmentTemplateTitle.create('A'.repeat(120)).isRight()).toBe(true);
  });

  it('rejects a title exceeding 120 characters', () => {
    const r = AssessmentTemplateTitle.create('A'.repeat(121));
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE);
  });
});

// ── TemplateFieldLabel value object ───────────────────────────────────────────

describe('TemplateFieldLabel', () => {
  it('creates a valid label and trims whitespace', () => {
    const r = TemplateFieldLabel.create('  Weight  ');
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe('Weight');
  });

  it('rejects an empty string', () => {
    const r = TemplateFieldLabel.create('');
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE);
  });

  it('rejects a whitespace-only string', () => {
    expect(TemplateFieldLabel.create('   ').isLeft()).toBe(true);
  });

  it('accepts a label of exactly 100 characters', () => {
    expect(TemplateFieldLabel.create('A'.repeat(100)).isRight()).toBe(true);
  });

  it('rejects a label exceeding 100 characters', () => {
    const r = TemplateFieldLabel.create('A'.repeat(101));
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE);
  });
});

// ── AssessmentTemplate.create ─────────────────────────────────────────────────

describe('AssessmentTemplate.create', () => {
  it('creates a template in DRAFT with no fields and contentVersion 1', () => {
    const template = makeTemplate();

    expect(template.status).toBe(AssessmentTemplateStatus.DRAFT);
    expect(template.fields.length).toBe(0);
    expect(template.contentVersion).toBe(1);
    expect(template.isDraft()).toBe(true);
    expect(template.isActive()).toBe(false);
    expect(template.isArchived()).toBe(false);
  });

  it('stores professionalProfileId, title, description, temporal fields', () => {
    const pid = generateId();
    const tz = 'America/Sao_Paulo';
    const logicalDay = makeLogicalDay();
    const r = AssessmentTemplate.create({
      professionalProfileId: pid,
      title: makeTitle('My Assessment'),
      description: 'A test description',
      createdAtUtc: UTCDateTime.now(),
      logicalDay,
      timezoneUsed: tz,
    });

    expect(r.isRight()).toBe(true);
    if (r.isRight()) {
      const t = r.value;
      expect(t.professionalProfileId).toBe(pid);
      expect(t.title.value).toBe('My Assessment');
      expect(t.description).toBe('A test description');
      expect(t.timezoneUsed).toBe(tz);
      expect(t.logicalDay.value).toBe('2026-02-22');
      expect(t.activatedAtUtc).toBeNull();
      expect(t.archivedAtUtc).toBeNull();
    }
  });

  it('uses a provided id', () => {
    const id = generateId();
    const r = AssessmentTemplate.create({
      id,
      professionalProfileId: generateId(),
      title: makeTitle(),
      createdAtUtc: UTCDateTime.now(),
      logicalDay: makeLogicalDay(),
      timezoneUsed: 'UTC',
    });
    if (r.isRight()) expect(r.value.id).toBe(id);
  });

  it('generates an id when not provided', () => {
    const t = makeTemplate();
    expect(t.id.length).toBeGreaterThan(0);
  });

  it('defaults description to null when not provided', () => {
    const t = makeTemplate();
    expect(t.description).toBeNull();
  });
});

// ── AssessmentTemplate.reconstitute ──────────────────────────────────────────

describe('AssessmentTemplate.reconstitute', () => {
  it('restores ACTIVE status and version from persisted data', () => {
    const template = makeActiveAssessmentTemplate({ contentVersion: 3, version: 5 });
    expect(template.status).toBe(AssessmentTemplateStatus.ACTIVE);
    expect(template.contentVersion).toBe(3);
    expect(template.version).toBe(5);
  });
});

// ── AssessmentTemplate.addField ───────────────────────────────────────────────

describe('AssessmentTemplate.addField', () => {
  let template: AssessmentTemplate;

  beforeEach(() => {
    template = makeTemplate();
  });

  it('adds a NUMBER field and increments contentVersion', () => {
    const result = addNumberField(template);

    expect(result.isRight()).toBe(true);
    expect(template.fields.length).toBe(1);
    expect(template.contentVersion).toBe(2);
  });

  it('assigns sequential orderIndex values', () => {
    addNumberField(template, 'Weight');
    addNumberField(template, 'Height');

    expect(template.fields[0]!.orderIndex).toBe(0);
    expect(template.fields[1]!.orderIndex).toBe(1);
  });

  it('uses the provided fieldId when given', () => {
    const fieldId = generateId();
    const result = addNumberField(template, 'Weight', fieldId);

    expect(result.isRight()).toBe(true);
    expect(template.fields[0]!.id).toBe(fieldId);
  });

  it('adds a SELECT field with options', () => {
    const result = template.addField({
      label: makeLabel('Posture'),
      fieldType: TemplateFieldType.SELECT,
      unit: null,
      required: false,
      options: ['Good', 'Fair', 'Poor'],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.fieldType).toBe(TemplateFieldType.SELECT);
      expect(result.value.options).toEqual(['Good', 'Fair', 'Poor']);
    }
  });

  it('returns AssessmentTemplateNotDraftError when template is ACTIVE', () => {
    const activeTemplate = makeActiveAssessmentTemplate();

    const result = addNumberField(activeTemplate);

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_DRAFT);
    }
  });

  it('returns AssessmentTemplateNotDraftError when template is ARCHIVED', () => {
    const archivedTemplate = makeArchivedAssessmentTemplate();

    const result = addNumberField(archivedTemplate);

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_DRAFT);
    }
  });
});

// ── AssessmentTemplate.removeField ───────────────────────────────────────────

describe('AssessmentTemplate.removeField', () => {
  it('removes an existing field and decrements the field list', () => {
    const template = makeTemplate();
    const addResult = addNumberField(template);
    if (addResult.isLeft()) throw new Error('setup failed');
    const fieldId = addResult.value.id;

    const removeResult = template.removeField(fieldId);

    expect(removeResult.isRight()).toBe(true);
    expect(template.fields.length).toBe(0);
    expect(template.contentVersion).toBe(3); // created=1, addField=2, removeField=3
  });

  it('reindexes remaining fields after removal', () => {
    const template = makeTemplate();
    addNumberField(template, 'A'); // orderIndex 0
    addNumberField(template, 'B'); // orderIndex 1
    addNumberField(template, 'C'); // orderIndex 2
    const firstId = template.fields[0]!.id;

    template.removeField(firstId);

    expect(template.fields.length).toBe(2);
    expect(template.fields[0]!.orderIndex).toBe(0);
    expect(template.fields[1]!.orderIndex).toBe(1);
  });

  it('returns TemplateFieldNotFoundError for an unknown fieldId', () => {
    const template = makeTemplate();

    const result = template.removeField(generateId());

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.TEMPLATE_FIELD_NOT_FOUND);
    }
  });

  it('returns AssessmentTemplateNotDraftError when template is ACTIVE', () => {
    const activeTemplate = makeActiveAssessmentTemplate();
    const fieldId = activeTemplate.fields[0]!.id;

    const result = activeTemplate.removeField(fieldId);

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_DRAFT);
    }
  });
});

// ── AssessmentTemplate.activateTemplate ──────────────────────────────────────

describe('AssessmentTemplate.activateTemplate', () => {
  it('transitions DRAFT → ACTIVE and sets activatedAtUtc', () => {
    const template = makeTemplate();
    addNumberField(template);

    const result = template.activateTemplate();

    expect(result.isRight()).toBe(true);
    expect(template.status).toBe(AssessmentTemplateStatus.ACTIVE);
    expect(template.activatedAtUtc).not.toBeNull();
    expect(template.isActive()).toBe(true);
  });

  it('returns EmptyTemplateFieldsError when there are no fields', () => {
    const template = makeTemplate();

    const result = template.activateTemplate();

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.EMPTY_TEMPLATE_FIELDS);
    }
  });

  it('returns InvalidAssessmentTemplateTransitionError when already ACTIVE', () => {
    const template = makeActiveAssessmentTemplate();

    const result = template.activateTemplate();

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE_TRANSITION);
    }
  });

  it('returns InvalidAssessmentTemplateTransitionError when ARCHIVED', () => {
    const template = makeArchivedAssessmentTemplate();

    const result = template.activateTemplate();

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE_TRANSITION);
    }
  });
});

// ── AssessmentTemplate.archiveTemplate ───────────────────────────────────────

describe('AssessmentTemplate.archiveTemplate', () => {
  it('transitions DRAFT → ARCHIVED and sets archivedAtUtc', () => {
    const template = makeAssessmentTemplate();

    const result = template.archiveTemplate();

    expect(result.isRight()).toBe(true);
    expect(template.status).toBe(AssessmentTemplateStatus.ARCHIVED);
    expect(template.archivedAtUtc).not.toBeNull();
    expect(template.isArchived()).toBe(true);
  });

  it('transitions ACTIVE → ARCHIVED', () => {
    const template = makeActiveAssessmentTemplate();

    const result = template.archiveTemplate();

    expect(result.isRight()).toBe(true);
    expect(template.status).toBe(AssessmentTemplateStatus.ARCHIVED);
  });

  it('returns InvalidAssessmentTemplateTransitionError when already ARCHIVED', () => {
    const template = makeArchivedAssessmentTemplate();

    const result = template.archiveTemplate();

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_TEMPLATE_TRANSITION);
    }
  });
});

// ── AssessmentTemplate.findField ─────────────────────────────────────────────

describe('AssessmentTemplate.findField', () => {
  it('returns the field when found', () => {
    const template = makeTemplate();
    const addResult = addNumberField(template);
    if (addResult.isLeft()) throw new Error('setup failed');
    const fieldId = addResult.value.id;

    const found = template.findField(fieldId);

    expect(found).toBeDefined();
    expect(found!.id).toBe(fieldId);
  });

  it('returns undefined when not found', () => {
    const template = makeTemplate();

    expect(template.findField(generateId())).toBeUndefined();
  });
});

// ── AssessmentTemplate getters: defensive copies ──────────────────────────────

describe('AssessmentTemplate.fields getter', () => {
  it('returns a copy — external mutation does not affect the aggregate', () => {
    const template = makeAssessmentTemplate(); // 1 field
    const copy = template.fields as AssessmentTemplate['fields'];
    // @ts-expect-error — intentional mutation of the copy
    copy.push(undefined);

    expect(template.fields.length).toBe(1);
  });
});

// ── Status predicate methods ──────────────────────────────────────────────────

describe('AssessmentTemplate status predicates', () => {
  it('isDraft returns true only for DRAFT', () => {
    expect(makeAssessmentTemplate({ status: AssessmentTemplateStatus.DRAFT }).isDraft()).toBe(true);
    expect(makeAssessmentTemplate({ status: AssessmentTemplateStatus.ACTIVE }).isDraft()).toBe(
      false,
    );
    expect(makeAssessmentTemplate({ status: AssessmentTemplateStatus.ARCHIVED }).isDraft()).toBe(
      false,
    );
  });

  it('isActive returns true only for ACTIVE', () => {
    expect(makeActiveAssessmentTemplate().isActive()).toBe(true);
    expect(makeAssessmentTemplate().isActive()).toBe(false);
  });

  it('isArchived returns true only for ARCHIVED', () => {
    expect(makeArchivedAssessmentTemplate().isArchived()).toBe(true);
    expect(makeAssessmentTemplate().isArchived()).toBe(false);
  });
});

// ── AssessmentTemplateField.reconstitute ──────────────────────────────────────

describe('AssessmentTemplateField.reconstitute', () => {
  it('restores a field from persisted props', () => {
    const id = generateId();
    const labelResult = TemplateFieldLabel.create('Weight');
    if (labelResult.isLeft()) throw new Error('setup failed');

    const field = AssessmentTemplateField.reconstitute(id, {
      label: labelResult.value,
      fieldType: TemplateFieldType.NUMBER,
      unit: 'kg',
      required: true,
      options: null,
      orderIndex: 2,
    });

    expect(field.id).toBe(id);
    expect(field.label.value).toBe('Weight');
    expect(field.fieldType).toBe(TemplateFieldType.NUMBER);
    expect(field.unit).toBe('kg');
    expect(field.required).toBe(true);
    expect(field.options).toBeNull();
    expect(field.orderIndex).toBe(2);
  });
});

// ── AssessmentTemplateNotActiveError ──────────────────────────────────────────

describe('AssessmentTemplateNotActiveError', () => {
  it('constructs with the expected error code and templateId in message', () => {
    const error = new AssessmentTemplateNotActiveError('tmpl-abc');
    expect(error.code).toBe(AssessmentErrorCodes.ASSESSMENT_TEMPLATE_NOT_ACTIVE);
    expect(error.message).toContain('tmpl-abc');
  });
});
