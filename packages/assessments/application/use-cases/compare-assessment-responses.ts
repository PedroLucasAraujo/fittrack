import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AssessmentResponseNotFoundError } from '../../domain/errors/assessment-response-not-found-error.js';
import type { IAssessmentResponseRepository } from '../../domain/repositories/assessment-response-repository.js';
import type { CompareAssessmentResponsesInputDTO } from '../dtos/compare-assessment-responses-input-dto.js';
import type {
  CompareAssessmentResponsesOutputDTO,
  FieldComparisonDTO,
} from '../dtos/compare-assessment-responses-output-dto.js';
import type { FieldValue } from '../../domain/value-objects/field-value.js';

/**
 * Compares two AssessmentResponses field-by-field (Q5 — application-layer service).
 *
 * ## Design rationale
 *
 * Comparison is a pure read operation that produces a structural diff of field
 * values between a baseline (earlier) and current (more recent) response. The
 * platform does NOT interpret what any delta means clinically (ADR-0028 §4).
 *
 * Comparison lives in the application layer rather than the domain because it
 * spans two aggregate instances and requires no mutation (ADR-0003, Q5 decision).
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): both responses must belong to the requesting
 *    tenant. Not found and cross-tenant access return the same error (404, never 403).
 * 2. Platform neutrality (ADR-0028 §4): numeric deltas are purely arithmetic
 *    (current − baseline). No clinical significance is attached.
 *
 * ## Field categories in the output
 *
 * - `fieldComparisons`: fields answered in BOTH responses (structural comparison).
 * - `newFieldIds`: fields answered in current but absent in baseline.
 * - `removedFieldIds`: fields answered in baseline but absent in current.
 */
export class CompareAssessmentResponses {
  constructor(private readonly responseRepository: IAssessmentResponseRepository) {}

  async execute(
    dto: CompareAssessmentResponsesInputDTO,
  ): Promise<DomainResult<CompareAssessmentResponsesOutputDTO>> {
    // 1. Load baseline response (tenant-scoped, ADR-0025)
    const baseline = await this.responseRepository.findById(
      dto.baselineResponseId,
      dto.professionalProfileId,
    );
    if (!baseline) {
      return left(new AssessmentResponseNotFoundError(dto.baselineResponseId));
    }

    // 2. Load current response (tenant-scoped, ADR-0025)
    const current = await this.responseRepository.findById(
      dto.currentResponseId,
      dto.professionalProfileId,
    );
    if (!current) {
      return left(new AssessmentResponseNotFoundError(dto.currentResponseId));
    }

    // 3. Build field maps (fieldId → FieldValue) for each response
    const baselineMap = new Map<string, FieldValue>(
      baseline.responses.map((r) => [r.fieldId, r.value]),
    );
    const currentMap = new Map<string, FieldValue>(
      current.responses.map((r) => [r.fieldId, r.value]),
    );

    // 4. Compute the three categories of fields
    const fieldComparisons: FieldComparisonDTO[] = [];
    const newFieldIds: string[] = [];
    const removedFieldIds: string[] = [];

    // Fields in baseline — either shared or removed
    for (const [fieldId, baselineValue] of baselineMap) {
      const currentValue = currentMap.get(fieldId) ?? null;

      if (currentValue !== null) {
        // Field present in both — produce a comparison entry
        const numericDelta =
          baselineValue.type === 'NUMBER' && currentValue.type === 'NUMBER'
            ? currentValue.value - baselineValue.value
            : null;

        const changed =
          baselineValue.type !== currentValue.type || baselineValue.value !== currentValue.value;

        fieldComparisons.push({
          fieldId,
          baseline: baselineValue,
          current: currentValue,
          numericDelta,
          changed,
        });
      } else {
        // Field answered in baseline but not in current
        removedFieldIds.push(fieldId);
      }
    }

    // Fields only in current (not in baseline)
    for (const fieldId of currentMap.keys()) {
      if (!baselineMap.has(fieldId)) {
        newFieldIds.push(fieldId);
      }
    }

    // 5. Sort fieldComparisons by fieldId for deterministic ordering
    fieldComparisons.sort((a, b) => a.fieldId.localeCompare(b.fieldId));

    return right({
      professionalProfileId: dto.professionalProfileId,
      baselineResponseId: baseline.id,
      baselineLogicalDay: baseline.logicalDay.value,
      currentResponseId: current.id,
      currentLogicalDay: current.logicalDay.value,
      fieldComparisons,
      newFieldIds,
      removedFieldIds,
    });
  }
}
