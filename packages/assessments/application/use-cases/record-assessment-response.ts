import { left, right, UTCDateTime, LogicalDay } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AssessmentResponse } from '../../domain/aggregates/assessment-response.js';
import { ExecutionNotConfirmedError } from '../../domain/errors/execution-not-confirmed-error.js';
import { DeliverableNotPhysiologicalAssessmentError } from '../../domain/errors/deliverable-not-physiological-assessment-error.js';
import { TemplateFieldNotFoundError } from '../../domain/errors/template-field-not-found-error.js';
import { FieldValueTypeMismatchError } from '../../domain/errors/field-value-type-mismatch-error.js';
import { InvalidAssessmentResponseError } from '../../domain/errors/invalid-assessment-response-error.js';
import { fieldValueMatchesType } from '../../domain/value-objects/field-value.js';
import type { IAssessmentResponseRepository } from '../../domain/repositories/assessment-response-repository.js';
import type { IExecutionPort } from '../ports/execution-port.js';
import type { IDeliverablePort } from '../ports/deliverable-port.js';
import type { RecordAssessmentResponseInputDTO } from '../dtos/record-assessment-response-input-dto.js';
import type { RecordAssessmentResponseOutputDTO } from '../dtos/record-assessment-response-output-dto.js';

const PHYSIOLOGICAL_ASSESSMENT_TYPE = 'PHYSIOLOGICAL_ASSESSMENT';

/**
 * Records an AssessmentResponse for a CONFIRMED Execution of a
 * PHYSIOLOGICAL_ASSESSMENT Deliverable.
 *
 * ## Enforced invariants
 *
 * 1. Execution must exist and belong to the requesting tenant (ADR-0025).
 *    The port returns null for both "not found" and "wrong tenant" (404, not 403).
 * 2. Execution must be CONFIRMED (ADR-0005 §9).
 *    PENDING and CANCELLED executions cannot receive assessment responses.
 * 3. Deliverable must be of type PHYSIOLOGICAL_ASSESSMENT (ADR-0044 §1).
 * 4. Each submitted fieldId must exist in the Deliverable's template snapshot.
 * 5. Each submitted value type must match the template field's fieldType.
 * 6. All required fields must have a response.
 *
 * ## Separation of concerns (Conflict A resolution)
 *
 * Execution records the FACT of assessment delivery.
 * AssessmentResponse records the DATA captured during delivery.
 * These are separate transactions under eventual consistency (ADR-0016).
 *
 * ## Snapshot reference chain (ADR-0011 §6, Q4 — Option A)
 *
 * AssessmentResponse stores executionId and deliverableId by ID only (ADR-0047 §3).
 * logicalDay and timezoneUsed are denormalized from the Execution record for
 * query efficiency; they are never recomputed (ADR-0010 §5).
 *
 * ## No domain events — see Q8 decision.
 */
export class RecordAssessmentResponse {
  constructor(
    private readonly responseRepository: IAssessmentResponseRepository,
    private readonly executionPort: IExecutionPort,
    private readonly deliverablePort: IDeliverablePort,
  ) {}

  async execute(
    dto: RecordAssessmentResponseInputDTO,
  ): Promise<DomainResult<RecordAssessmentResponseOutputDTO>> {
    // 1. Load Execution via anti-corruption port (tenant-scoped, ADR-0025).
    //    Null means not found OR cross-tenant probe — both return the same error
    //    to prevent tenant existence leakage (ADR-0025 §3).
    const execution = await this.executionPort.findById(dto.executionId, dto.professionalProfileId);
    if (!execution) {
      return left(new ExecutionNotConfirmedError(dto.executionId));
    }

    // 2. Execution must be CONFIRMED (ADR-0005 §9)
    if (execution.status !== 'CONFIRMED') {
      return left(new ExecutionNotConfirmedError(dto.executionId));
    }

    // 3. Load Deliverable via anti-corruption port (tenant-scoped, ADR-0025)
    const deliverable = await this.deliverablePort.findById(
      execution.deliverableId,
      dto.professionalProfileId,
    );
    if (!deliverable) {
      return left(new DeliverableNotPhysiologicalAssessmentError(execution.deliverableId));
    }

    // 4. Deliverable must be a PHYSIOLOGICAL_ASSESSMENT (ADR-0044 §1)
    if (deliverable.type !== PHYSIOLOGICAL_ASSESSMENT_TYPE) {
      return left(new DeliverableNotPhysiologicalAssessmentError(execution.deliverableId));
    }

    // 5. Build a lookup map from fieldId → field definition (snapshot, ADR-0011)
    const fieldMap = new Map(deliverable.templateFields.map((f) => [f.id, f]));

    // 6. Validate each submitted response against the template snapshot
    for (const response of dto.responses) {
      const field = fieldMap.get(response.fieldId);
      if (!field) {
        return left(new TemplateFieldNotFoundError(response.fieldId));
      }
      if (!fieldValueMatchesType(response.value, field.fieldType)) {
        return left(
          new FieldValueTypeMismatchError(response.fieldId, field.fieldType, response.value.type),
        );
      }
    }

    // 7. Validate all required fields have a response
    const answeredFieldIds = new Set(dto.responses.map((r) => r.fieldId));
    for (const field of deliverable.templateFields) {
      if (field.required && !answeredFieldIds.has(field.id)) {
        return left(
          new InvalidAssessmentResponseError(
            `required field "${field.id}" ("${field.label}") has no response`,
          ),
        );
      }
    }

    // 8. Parse createdAtUtc (ADR-0010)
    const createdAtUtcResult = UTCDateTime.fromISO(dto.createdAtUtc);
    if (createdAtUtcResult.isLeft()) return left(createdAtUtcResult.value);

    // 9. Reconstitute logicalDay from the Execution record (already computed,
    //    denormalized, immutable — never recomputed here, ADR-0010 §5)
    const logicalDayResult = LogicalDay.create(execution.logicalDay);
    if (logicalDayResult.isLeft()) return left(logicalDayResult.value);

    // 10. Create the AssessmentResponse aggregate (domain enforces ≥1 response
    //     and no duplicate fieldIds; application layer has pre-validated the rest)
    const responseResult = AssessmentResponse.create({
      executionId: execution.id,
      deliverableId: execution.deliverableId,
      professionalProfileId: dto.professionalProfileId,
      clientId: execution.clientId,
      logicalDay: logicalDayResult.value,
      timezoneUsed: execution.timezoneUsed,
      responses: dto.responses,
      createdAtUtc: createdAtUtcResult.value,
    });
    if (responseResult.isLeft()) return left(responseResult.value);

    const assessmentResponse = responseResult.value;

    await this.responseRepository.save(assessmentResponse);

    return right({
      assessmentResponseId: assessmentResponse.id,
      executionId: assessmentResponse.executionId,
      deliverableId: assessmentResponse.deliverableId,
      professionalProfileId: assessmentResponse.professionalProfileId,
      clientId: assessmentResponse.clientId,
      logicalDay: assessmentResponse.logicalDay.value,
      timezoneUsed: assessmentResponse.timezoneUsed,
      responseCount: assessmentResponse.responseCount,
      responses: assessmentResponse.responses.map((r) => ({
        fieldId: r.fieldId,
        value: r.value,
      })),
      createdAtUtc: assessmentResponse.createdAtUtc.toISO(),
    });
  }
}
