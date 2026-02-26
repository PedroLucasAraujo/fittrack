import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ServicePlanArchived } from '../../domain/events/service-plan-archived.js';
import { ServicePlanNotFoundError } from '../../domain/errors/service-plan-not-found-error.js';
import type { IServicePlanRepository } from '../../domain/repositories/service-plan-repository.js';
import type { IBillingEventPublisher } from '../ports/billing-event-publisher-port.js';
import type { ArchiveServicePlanInputDTO } from '../dtos/archive-service-plan-input-dto.js';
import type { ArchiveServicePlanOutputDTO } from '../dtos/archive-service-plan-output-dto.js';

export class ArchiveServicePlan {
  constructor(
    private readonly planRepository: IServicePlanRepository,
    private readonly eventPublisher: IBillingEventPublisher,
  ) {}

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

    await this.eventPublisher.publishServicePlanArchived(
      new ServicePlanArchived(plan.id, plan.professionalProfileId, {
        name: plan.name,
      }),
    );

    return right({
      planId: plan.id,
      status: plan.status,
      archivedAtUtc: archivedAtUtc.toISO(),
    });
  }
}
