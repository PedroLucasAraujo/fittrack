import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { DeliverableNotFoundError } from '../../domain/errors/deliverable-not-found-error.js';
import type { IDeliverableRepository } from '../../domain/repositories/deliverable-repository.js';
import type { ActivateDeliverableInputDTO } from '../dtos/activate-deliverable-input-dto.js';
import type { ActivateDeliverableOutputDTO } from '../dtos/activate-deliverable-output-dto.js';

/**
 * Transitions a Deliverable from DRAFT → ACTIVE.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): scoped lookup via `professionalProfileId`.
 * 2. State machine (ADR-0008): only DRAFT → ACTIVE is permitted.
 * 3. TRAINING_PRESCRIPTION invariant: at least one ExerciseAssignment must exist.
 *
 * ## Effect
 *
 * Locks the content snapshot. No further exercise mutations are permitted
 * after activation (ADR-0011 §3). The Deliverable is now assignable to
 * clients via AccessGrant.
 */
export class ActivateDeliverable {
  constructor(private readonly deliverableRepository: IDeliverableRepository) {}

  async execute(
    dto: ActivateDeliverableInputDTO,
  ): Promise<DomainResult<ActivateDeliverableOutputDTO>> {
    // 1. Scoped lookup — returns null for wrong tenant (ADR-0025)
    const deliverable = await this.deliverableRepository.findByIdAndProfessionalProfileId(
      dto.deliverableId,
      dto.professionalProfileId,
    );

    if (!deliverable) {
      return left(new DeliverableNotFoundError(dto.deliverableId));
    }

    // 2. State transition (validates DRAFT → ACTIVE and TRAINING_PRESCRIPTION invariant)
    const activateResult = deliverable.activate();
    if (activateResult.isLeft()) return left(activateResult.value);

    await this.deliverableRepository.save(deliverable);

    return right({
      deliverableId: deliverable.id,
      type: deliverable.type,
      status: deliverable.status,
      contentVersion: deliverable.contentVersion,
      /* v8 ignore next */
      activatedAtUtc: deliverable.activatedAtUtc?.toISO() ?? '',
    });
  }
}
