import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { RecordAssessmentResponse } from '../../../application/use-cases/record-assessment-response.js';
import { InMemoryAssessmentResponseRepository } from '../../repositories/in-memory-assessment-response-repository.js';
import { InMemoryExecutionStub } from '../../stubs/in-memory-execution-stub.js';
import { InMemoryDeliverableStub } from '../../stubs/in-memory-deliverable-stub.js';
import type { ExecutionView } from '../../../application/ports/execution-port.js';
import type { DeliverableView } from '../../../application/ports/deliverable-port.js';
import { TemplateFieldType } from '../../../domain/enums/template-field-type.js';
import { AssessmentErrorCodes } from '../../../domain/errors/assessment-error-codes.js';
import { numberFieldValue, textFieldValue } from '../../../domain/value-objects/field-value.js';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const CONFIRMED_STATUS = 'CONFIRMED' as const;
const PHYSIOLOGICAL_ASSESSMENT_TYPE = 'PHYSIOLOGICAL_ASSESSMENT';

function makeConfirmedExecution(overrides: Partial<ExecutionView> = {}): ExecutionView {
  const professionalProfileId = overrides.professionalProfileId ?? generateId();
  return {
    id: generateId(),
    status: CONFIRMED_STATUS,
    deliverableId: generateId(),
    professionalProfileId,
    clientId: generateId(),
    logicalDay: '2026-02-22',
    timezoneUsed: 'America/Sao_Paulo',
    ...overrides,
  };
}

function makePhysiologicalDeliverable(
  overrides: Partial<DeliverableView> & { fieldId?: string } = {},
): DeliverableView {
  const fieldId = overrides.fieldId ?? generateId();
  return {
    id: generateId(),
    type: PHYSIOLOGICAL_ASSESSMENT_TYPE,
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    templateFields: [
      {
        id: fieldId,
        label: 'Weight',
        fieldType: TemplateFieldType.NUMBER,
        unit: 'kg',
        required: true,
        options: null,
      },
    ],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RecordAssessmentResponse', () => {
  let responseRepository: InMemoryAssessmentResponseRepository;
  let executionStub: InMemoryExecutionStub;
  let deliverableStub: InMemoryDeliverableStub;
  let sut: RecordAssessmentResponse;

  beforeEach(() => {
    responseRepository = new InMemoryAssessmentResponseRepository();
    executionStub = new InMemoryExecutionStub();
    deliverableStub = new InMemoryDeliverableStub();
    sut = new RecordAssessmentResponse(responseRepository, executionStub, deliverableStub);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('records a response for a CONFIRMED execution with valid field values', async () => {
    const professionalProfileId = generateId();
    const fieldId = generateId();

    const deliverable = makePhysiologicalDeliverable({ professionalProfileId, fieldId });
    const execution = makeConfirmedExecution({
      professionalProfileId,
      deliverableId: deliverable.id,
    });

    executionStub.items.push(execution);
    deliverableStub.items.push(deliverable);

    const result = await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [{ fieldId, value: numberFieldValue(75) }],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const out = result.value;
      expect(out.executionId).toBe(execution.id);
      expect(out.deliverableId).toBe(deliverable.id);
      expect(out.professionalProfileId).toBe(professionalProfileId);
      expect(out.clientId).toBe(execution.clientId);
      expect(out.logicalDay).toBe('2026-02-22');
      expect(out.timezoneUsed).toBe('America/Sao_Paulo');
      expect(out.responseCount).toBe(1);
      expect(out.responses[0]!.fieldId).toBe(fieldId);
    }
  });

  it('persists the response in the repository', async () => {
    const professionalProfileId = generateId();
    const fieldId = generateId();

    const deliverable = makePhysiologicalDeliverable({ professionalProfileId, fieldId });
    const execution = makeConfirmedExecution({
      professionalProfileId,
      deliverableId: deliverable.id,
    });

    executionStub.items.push(execution);
    deliverableStub.items.push(deliverable);

    await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [{ fieldId, value: numberFieldValue(75) }],
    });

    expect(responseRepository.items).toHaveLength(1);
  });

  it('does not require all optional fields to have responses', async () => {
    const professionalProfileId = generateId();
    const requiredFieldId = generateId();
    const optionalFieldId = generateId();

    const deliverable: DeliverableView = {
      id: generateId(),
      type: PHYSIOLOGICAL_ASSESSMENT_TYPE,
      professionalProfileId,
      templateFields: [
        {
          id: requiredFieldId,
          label: 'Weight',
          fieldType: TemplateFieldType.NUMBER,
          unit: 'kg',
          required: true,
          options: null,
        },
        {
          id: optionalFieldId,
          label: 'Notes',
          fieldType: TemplateFieldType.TEXT,
          unit: null,
          required: false,
          options: null,
        },
      ],
    };
    const execution = makeConfirmedExecution({
      professionalProfileId,
      deliverableId: deliverable.id,
    });

    executionStub.items.push(execution);
    deliverableStub.items.push(deliverable);

    // Only provide the required field
    const result = await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [{ fieldId: requiredFieldId, value: numberFieldValue(75) }],
    });

    expect(result.isRight()).toBe(true);
  });

  // ── Execution errors ────────────────────────────────────────────────────────

  it('returns ExecutionNotConfirmedError when execution is not found', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      executionId: generateId(),
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.EXECUTION_NOT_CONFIRMED);
    }
  });

  it('returns ExecutionNotConfirmedError when execution belongs to a different professional (ADR-0025)', async () => {
    const professionalA = generateId();
    const fieldId = generateId();
    const deliverable = makePhysiologicalDeliverable({
      professionalProfileId: professionalA,
      fieldId,
    });
    const execution = makeConfirmedExecution({
      professionalProfileId: professionalA,
      deliverableId: deliverable.id,
    });

    executionStub.items.push(execution);
    deliverableStub.items.push(deliverable);

    const result = await sut.execute({
      professionalProfileId: generateId(), // professionalB
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [{ fieldId, value: numberFieldValue(75) }],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.EXECUTION_NOT_CONFIRMED);
    }
  });

  it('returns ExecutionNotConfirmedError when execution is PENDING', async () => {
    const professionalProfileId = generateId();
    const execution = makeConfirmedExecution({ professionalProfileId, status: 'PENDING' });
    executionStub.items.push(execution);

    const result = await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.EXECUTION_NOT_CONFIRMED);
    }
  });

  it('returns ExecutionNotConfirmedError when execution is CANCELLED', async () => {
    const professionalProfileId = generateId();
    const execution = makeConfirmedExecution({ professionalProfileId, status: 'CANCELLED' });
    executionStub.items.push(execution);

    const result = await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.EXECUTION_NOT_CONFIRMED);
    }
  });

  // ── Deliverable errors ──────────────────────────────────────────────────────

  it('returns DeliverableNotPhysiologicalAssessmentError when deliverable not found', async () => {
    const professionalProfileId = generateId();
    const execution = makeConfirmedExecution({ professionalProfileId });
    executionStub.items.push(execution);
    // Deliverable NOT added to stub

    const result = await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.DELIVERABLE_NOT_PHYSIOLOGICAL_ASSESSMENT);
    }
  });

  it('returns DeliverableNotPhysiologicalAssessmentError for wrong deliverable type', async () => {
    const professionalProfileId = generateId();
    const deliverable: DeliverableView = {
      id: generateId(),
      type: 'WORKOUT_PLAN', // wrong type
      professionalProfileId,
      templateFields: [],
    };
    const execution = makeConfirmedExecution({
      professionalProfileId,
      deliverableId: deliverable.id,
    });

    executionStub.items.push(execution);
    deliverableStub.items.push(deliverable);

    const result = await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.DELIVERABLE_NOT_PHYSIOLOGICAL_ASSESSMENT);
    }
  });

  // ── Field validation errors ─────────────────────────────────────────────────

  it('returns TemplateFieldNotFoundError when response references an unknown fieldId', async () => {
    const professionalProfileId = generateId();
    const deliverable = makePhysiologicalDeliverable({ professionalProfileId });
    const execution = makeConfirmedExecution({
      professionalProfileId,
      deliverableId: deliverable.id,
    });

    executionStub.items.push(execution);
    deliverableStub.items.push(deliverable);

    const result = await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [{ fieldId: generateId(), value: numberFieldValue(75) }],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.TEMPLATE_FIELD_NOT_FOUND);
    }
  });

  it('returns FieldValueTypeMismatchError when value type does not match field type', async () => {
    const professionalProfileId = generateId();
    const fieldId = generateId();
    const deliverable = makePhysiologicalDeliverable({ professionalProfileId, fieldId });
    const execution = makeConfirmedExecution({
      professionalProfileId,
      deliverableId: deliverable.id,
    });

    executionStub.items.push(execution);
    deliverableStub.items.push(deliverable);

    // Field is NUMBER but we send TEXT
    const result = await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [{ fieldId, value: textFieldValue('wrong type') }],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.FIELD_VALUE_TYPE_MISMATCH);
    }
  });

  it('returns InvalidAssessmentResponseError when a required field has no response', async () => {
    const professionalProfileId = generateId();
    const deliverable = makePhysiologicalDeliverable({ professionalProfileId });
    // Required field present in deliverable, but no response provided
    const execution = makeConfirmedExecution({
      professionalProfileId,
      deliverableId: deliverable.id,
    });

    executionStub.items.push(execution);
    deliverableStub.items.push(deliverable);

    const result = await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [], // required field not answered
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.INVALID_ASSESSMENT_RESPONSE);
    }
  });

  // ── Temporal errors ─────────────────────────────────────────────────────────

  it('returns error for non-UTC createdAtUtc string', async () => {
    const professionalProfileId = generateId();
    const fieldId = generateId();
    const deliverable = makePhysiologicalDeliverable({ professionalProfileId, fieldId });
    const execution = makeConfirmedExecution({
      professionalProfileId,
      deliverableId: deliverable.id,
    });

    executionStub.items.push(execution);
    deliverableStub.items.push(deliverable);

    const result = await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000+03:00',
      responses: [{ fieldId, value: numberFieldValue(75) }],
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error when execution.logicalDay is malformed', async () => {
    const professionalProfileId = generateId();
    const fieldId = generateId();
    const deliverable = makePhysiologicalDeliverable({ professionalProfileId, fieldId });
    const execution: ExecutionView = {
      ...makeConfirmedExecution({ professionalProfileId, deliverableId: deliverable.id }),
      logicalDay: 'not-a-valid-date', // malformed — LogicalDay.create rejects it
    };

    executionStub.items.push(execution);
    deliverableStub.items.push(deliverable);

    const result = await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [{ fieldId, value: numberFieldValue(75) }],
    });

    expect(result.isLeft()).toBe(true);
  });

  it('propagates domain error when AssessmentResponse.create rejects duplicate fieldIds', async () => {
    const professionalProfileId = generateId();
    const fieldId = generateId();
    const deliverable = makePhysiologicalDeliverable({ professionalProfileId, fieldId });
    const execution = makeConfirmedExecution({
      professionalProfileId,
      deliverableId: deliverable.id,
    });

    executionStub.items.push(execution);
    deliverableStub.items.push(deliverable);

    // Two responses for the same fieldId pass application-layer validation
    // (field exists, type matches, required field is "answered") but are
    // rejected by AssessmentResponse.create as a duplicate
    const result = await sut.execute({
      professionalProfileId,
      executionId: execution.id,
      createdAtUtc: '2026-02-22T14:00:00.000Z',
      responses: [
        { fieldId, value: numberFieldValue(75) },
        { fieldId, value: numberFieldValue(80) },
      ],
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AssessmentErrorCodes.DUPLICATE_FIELD_RESPONSE);
    }
  });
});
