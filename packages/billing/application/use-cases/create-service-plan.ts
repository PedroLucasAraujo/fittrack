import { left, right, UniqueEntityId, Money } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ServicePlan } from '../../domain/aggregates/service-plan.js';
import { PlanType } from '../../domain/enums/plan-type.js';
import { InvalidServicePlanError } from '../../domain/errors/invalid-service-plan-error.js';
import type { IServicePlanRepository } from '../../domain/repositories/service-plan-repository.js';
import type { CreateServicePlanInputDTO } from '../dtos/create-service-plan-input-dto.js';
import type { CreateServicePlanOutputDTO } from '../dtos/create-service-plan-output-dto.js';

export class CreateServicePlan {
  constructor(
    private readonly planRepository: IServicePlanRepository,
  ) {}

  async execute(
    dto: CreateServicePlanInputDTO,
  ): Promise<DomainResult<CreateServicePlanOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.professionalProfileId);
    if (idResult.isLeft()) return left(idResult.value);

    const priceResult = Money.create(dto.priceAmount, dto.priceCurrency);
    if (priceResult.isLeft()) return left(priceResult.value);

    if (!Object.values(PlanType).includes(dto.type as PlanType)) {
      return left(
        new InvalidServicePlanError(
          `Invalid plan type: "${dto.type}". Must be one of: ${Object.values(PlanType).join(', ')}`,
        ),
      );
    }

    const planResult = ServicePlan.create({
      professionalProfileId: dto.professionalProfileId,
      name: dto.name,
      description: dto.description,
      price: priceResult.value,
      durationDays: dto.durationDays,
      sessionAllotment: dto.sessionAllotment,
      type: dto.type as PlanType,
    });

    if (planResult.isLeft()) return left(planResult.value);

    const plan = planResult.value;
    await this.planRepository.save(plan);

    return right({
      id: plan.id,
      professionalProfileId: plan.professionalProfileId,
      name: plan.name,
      description: plan.description,
      priceAmount: plan.price.amount,
      priceCurrency: plan.price.currency,
      durationDays: plan.durationDays,
      sessionAllotment: plan.sessionAllotment,
      type: plan.type,
      status: plan.status,
      createdAtUtc: plan.createdAtUtc.toISO(),
    });
  }
}
