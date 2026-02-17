import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { InitiatePurchase } from '../../../application/use-cases/initiate-purchase.js';
import { InMemoryServicePlanRepository } from '../../repositories/in-memory-service-plan-repository.js';
import { InMemoryTransactionRepository } from '../../repositories/in-memory-transaction-repository.js';
import { makeServicePlan } from '../../factories/make-service-plan.js';
import { ServicePlanStatus } from '../../../domain/enums/service-plan-status.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.js';
import { BillingErrorCodes } from '../../../domain/errors/billing-error-codes.js';

describe('InitiatePurchase', () => {
  let planRepository: InMemoryServicePlanRepository;
  let transactionRepository: InMemoryTransactionRepository;
  let sut: InitiatePurchase;

  beforeEach(() => {
    planRepository = new InMemoryServicePlanRepository();
    transactionRepository = new InMemoryTransactionRepository();
    sut = new InitiatePurchase(planRepository, transactionRepository);
  });

  it('creates a PENDING transaction for an ACTIVE plan', async () => {
    const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
    planRepository.items.push(plan);

    const result = await sut.execute({
      clientId: generateId(),
      professionalProfileId: plan.professionalProfileId,
      servicePlanId: plan.id,
      feePercentage: 1000,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.status).toBe(TransactionStatus.PENDING);
      expect(output.amountCents).toBe(plan.price.amount);
      expect(output.currency).toBe(plan.price.currency);
      expect(output.platformFeeCents).toBe(999); // 9990 * 1000 / 10000
      expect(output.professionalAmountCents).toBe(8991); // 9990 - 999
      expect(output.createdAtUtc).toBeDefined();
    }
  });

  it('persists transaction in repository', async () => {
    const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
    planRepository.items.push(plan);

    await sut.execute({
      clientId: generateId(),
      professionalProfileId: plan.professionalProfileId,
      servicePlanId: plan.id,
      feePercentage: 1000,
    });

    expect(transactionRepository.items).toHaveLength(1);
  });

  it('returns error if ServicePlan not found', async () => {
    const result = await sut.execute({
      clientId: generateId(),
      professionalProfileId: generateId(),
      servicePlanId: generateId(),
      feePercentage: 1000,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.SERVICE_PLAN_NOT_FOUND);
    }
  });

  it('returns error if ServicePlan is not ACTIVE', async () => {
    const plan = makeServicePlan({ status: ServicePlanStatus.DRAFT });
    planRepository.items.push(plan);

    const result = await sut.execute({
      clientId: generateId(),
      professionalProfileId: plan.professionalProfileId,
      servicePlanId: plan.id,
      feePercentage: 1000,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.SERVICE_PLAN_NOT_ACTIVE);
    }
  });

  it('returns error if clientId is not a valid UUID', async () => {
    const result = await sut.execute({
      clientId: 'not-a-uuid',
      professionalProfileId: generateId(),
      servicePlanId: generateId(),
      feePercentage: 1000,
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error if professionalProfileId is not a valid UUID', async () => {
    const result = await sut.execute({
      clientId: generateId(),
      professionalProfileId: 'not-a-uuid',
      servicePlanId: generateId(),
      feePercentage: 1000,
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error if servicePlanId is not a valid UUID', async () => {
    const result = await sut.execute({
      clientId: generateId(),
      professionalProfileId: generateId(),
      servicePlanId: 'not-a-uuid',
      feePercentage: 1000,
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for invalid fee percentage', async () => {
    const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
    planRepository.items.push(plan);

    const result = await sut.execute({
      clientId: generateId(),
      professionalProfileId: plan.professionalProfileId,
      servicePlanId: plan.id,
      feePercentage: -1,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.INVALID_PLATFORM_FEE);
    }
  });
});
