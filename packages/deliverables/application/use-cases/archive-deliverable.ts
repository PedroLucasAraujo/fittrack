import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { DeliverableNotFoundError } from '../../domain/errors/deliverable-not-found-error.js';
import type { IDeliverableRepository } from '../../domain/repositories/deliverable-repository.js';
import type { ArchiveDeliverableInputDTO } from '../dtos/archive-deliverable-input-dto.js';
import type { ArchiveDeliverableOutputDTO } from '../dtos/archive-deliverable-output-dto.js';

/**
 * Transitions a Deliverable to ARCHIVED (terminal state).
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): scoped lookup via `professionalProfileId`.
 * 2. State machine (ADR-0008): DRAFT | ACTIVE → ARCHIVED permitted.
 *    ARCHIVED → ARCHIVED is rejected (already terminal).
 *
 * ## Effect
 *
 * The Deliverable is permanently retired. No new assignments are possible.
 * Existing Execution records that reference this Deliverable are NOT affected
 * — Execution immutability is absolute (ADR-0005).
 */
export class ArchiveDeliverable {
  constructor(private readonly deliverableRepository: IDeliverableRepository) {}

  async execute(
    dto: ArchiveDeliverableInputDTO,
  ): Promise<DomainResult<ArchiveDeliverableOutputDTO>> {
    // 1. Scoped lookup — returns null for wrong tenant (ADR-0025)
    const deliverable = await this.deliverableRepository.findByIdAndProfessionalProfileId(
      dto.deliverableId,
      dto.professionalProfileId,
    );

    if (!deliverable) {
      return left(new DeliverableNotFoundError(dto.deliverableId));
    }

    // 2. State transition
    const archiveResult = deliverable.archive();
    if (archiveResult.isLeft()) return left(archiveResult.value);

    await this.deliverableRepository.save(deliverable);

    return right({
      deliverableId: deliverable.id,
      type: deliverable.type,
      status: deliverable.status,
      /* v8 ignore next */
      archivedAtUtc: deliverable.archivedAtUtc?.toISO() ?? '',
    });
  }
}
