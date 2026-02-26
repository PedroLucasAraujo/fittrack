import { describe, it, expect, beforeEach } from 'vitest';
import { ActivateServicePlan } from '../../../application/use-cases/activate-service-plan.js';
import { InMemoryServicePlanRepository } from '../../repositories/in-memory-service-plan-repository.js';
import { InMemoryBillingEventPublisherStub } from '../../stubs/in-memory-billing-event-publisher-stub.js';
import { makeServicePlan } from '../../factories/make-service-plan.js';
import { ServicePlanStatus } from '../../../domain/enums/service-plan-status.js';
import { BillingErrorCodes } from '../../../domain/errors/billing-error-codes.js';

describe('ActivateServicePlan', () => {
  let planRepository: InMemoryServicePlanRepository;
  let eventPublisher: InMemoryBillingEventPublisherStub;
  let sut: ActivateServicePlan;

  beforeEach(() => {
    planRepository = new InMemoryServicePlanRepository();
    eventPublisher = new InMemoryBillingEventPublisherStub();
    sut = new ActivateServicePlan(planRepository, eventPublisher);
  });

  it('activates a DRAFT plan and returns output DTO', async () => {
    const plan = makeServicePlan({ status: ServicePlanStatus.DRAFT });
    planRepository.items.push(plan);

    const result = await sut.execute({ servicePlanId: plan.id });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.planId).toBe(plan.id);
      expect(result.value.status).toBe(ServicePlanStatus.ACTIVE);
      expect(result.value.activatedAtUtc).toBeDefined();
    }
  });

  it('returns error if plan not found', async () => {
    const result = await sut.execute({
      servicePlanId: 'a0000000-0000-4000-8000-000000000000',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.SERVICE_PLAN_NOT_FOUND);
    }
  });

  it('returns error if plan is already ACTIVE', async () => {
    const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
    planRepository.items.push(plan);

    const result = await sut.execute({ servicePlanId: plan.id });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.INVALID_SERVICE_PLAN_TRANSITION);
    }
  });

  it('returns error if servicePlanId is not a valid UUID', async () => {
    const result = await sut.execute({ servicePlanId: 'not-a-uuid' });
    expect(result.isLeft()).toBe(true);
  });

  it('publishes ServicePlanActivated event on success', async () => {
    const plan = makeServicePlan({ status: ServicePlanStatus.DRAFT });
    planRepository.items.push(plan);

    await sut.execute({ servicePlanId: plan.id });

    expect(eventPublisher.publishedServicePlanActivated).toHaveLength(1);
    expect(eventPublisher.publishedServicePlanActivated[0]!.aggregateId).toBe(plan.id);
  });

  it('does not publish event when plan is not found', async () => {
    await sut.execute({ servicePlanId: 'a0000000-0000-4000-8000-000000000000' });

    expect(eventPublisher.publishedServicePlanActivated).toHaveLength(0);
  });

  it('does not publish event when transition fails', async () => {
    const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
    planRepository.items.push(plan);

    await sut.execute({ servicePlanId: plan.id });

    expect(eventPublisher.publishedServicePlanActivated).toHaveLength(0);
  });
});
