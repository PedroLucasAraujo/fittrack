import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ServicePlanNotFoundError } from '../../domain/errors/service-plan-not-found-error.js';
import type { IServicePlanRepository } from '../../domain/repositories/service-plan-repository.js';
import type { ArchiveServicePlanInputDTO } from '../dtos/archive-service-plan-input-dto.js';
import type { ArchiveServicePlanOutputDTO } from '../dtos/archive-service-plan-output-dto.js';

export class ArchiveServicePlan {
  constructor(private readonly planRepository: IServicePlanRepository) {}

  async execute(
    dto: ArchiveServicePlanInputDTO,
  ): Promise<DomainResult<ArchiveServicePlanOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.servicePlanId);
    if (idResult.isLeft()) return left(idResult.value);

    const plan = await this.planRepository.findById(idResult.value);
    if (!plan) {
      return left(new ServicePlanNotFoundError(dto.servicePlanId));
    }

    const archiveResult = plan.archive();
    if (archiveResult.isLeft()) return left(archiveResult.value);

    await this.planRepository.save(plan);

    const archivedAtUtc = plan.archivedAtUtc;
    /* v8 ignore next */
    if (!archivedAtUtc) throw new Error('Invariant: archivedAtUtc must be set after archive()');

    return right({
      planId: plan.id,
      status: plan.status,
      archivedAtUtc: archivedAtUtc.toISO(),
    });
  }
}
