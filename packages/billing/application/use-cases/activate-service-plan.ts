import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ServicePlanNotFoundError } from '../../domain/errors/service-plan-not-found-error.js';
import type { IServicePlanRepository } from '../../domain/repositories/service-plan-repository.js';
import type { ActivateServicePlanInputDTO } from '../dtos/activate-service-plan-input-dto.js';
import type { ActivateServicePlanOutputDTO } from '../dtos/activate-service-plan-output-dto.js';

export class ActivateServicePlan {
  constructor(private readonly planRepository: IServicePlanRepository) {}

  async execute(
    dto: ActivateServicePlanInputDTO,
  ): Promise<DomainResult<ActivateServicePlanOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.servicePlanId);
    if (idResult.isLeft()) return left(idResult.value);

    const plan = await this.planRepository.findById(idResult.value);
    if (!plan) {
      return left(new ServicePlanNotFoundError(dto.servicePlanId));
    }

    const activateResult = plan.activate();
    if (activateResult.isLeft()) return left(activateResult.value);

    await this.planRepository.save(plan);

    const activatedAtUtc = plan.activatedAtUtc;
    /* v8 ignore next */
    if (!activatedAtUtc) throw new Error('Invariant: activatedAtUtc must be set after activate()');

    return right({
      planId: plan.id,
      status: plan.status,
      activatedAtUtc: activatedAtUtc.toISO(),
    });
  }
}
