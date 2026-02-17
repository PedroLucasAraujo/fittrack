import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CreateServicePlan } from '../../../application/use-cases/create-service-plan.js';
import { InMemoryServicePlanRepository } from '../../repositories/in-memory-service-plan-repository.js';
import { ServicePlanStatus } from '../../../domain/enums/service-plan-status.js';
import { BillingErrorCodes } from '../../../domain/errors/billing-error-codes.js';

describe('CreateServicePlan', () => {
  let planRepository: InMemoryServicePlanRepository;
  let sut: CreateServicePlan;

  beforeEach(() => {
    planRepository = new InMemoryServicePlanRepository();
    sut = new CreateServicePlan(planRepository);
  });

  it('creates a service plan in DRAFT status and returns output DTO', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Monthly Training',
      description: 'Complete fitness plan',
      priceAmount: 9990,
      priceCurrency: 'BRL',
      durationDays: 30,
      sessionAllotment: 12,
      type: 'RECURRING',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.name).toBe('Monthly Training');
      expect(output.status).toBe(ServicePlanStatus.DRAFT);
      expect(output.priceAmount).toBe(9990);
      expect(output.priceCurrency).toBe('BRL');
      expect(output.durationDays).toBe(30);
      expect(output.sessionAllotment).toBe(12);
      expect(output.type).toBe('RECURRING');
      expect(output.createdAtUtc).toBeDefined();
    }
  });

  it('persists the plan in the repository', async () => {
    await sut.execute({
      professionalProfileId: generateId(),
      name: 'Basic Plan',
      description: 'Basic fitness plan',
      priceAmount: 4990,
      priceCurrency: 'BRL',
      durationDays: 30,
      type: 'ONE_TIME',
    });

    expect(planRepository.items).toHaveLength(1);
  });

  it('returns error if professionalProfileId is not a valid UUID', async () => {
    const result = await sut.execute({
      professionalProfileId: 'not-a-uuid',
      name: 'Plan',
      description: 'Desc',
      priceAmount: 9990,
      priceCurrency: 'BRL',
      durationDays: 30,
      type: 'RECURRING',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for invalid price (zero)', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Plan',
      description: 'Desc',
      priceAmount: 0,
      priceCurrency: 'BRL',
      durationDays: 30,
      type: 'RECURRING',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.INVALID_SERVICE_PLAN);
    }
  });

  it('returns error for invalid currency', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Plan',
      description: 'Desc',
      priceAmount: 9990,
      priceCurrency: 'invalid',
      durationDays: 30,
      type: 'RECURRING',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for empty name', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: '',
      description: 'Desc',
      priceAmount: 9990,
      priceCurrency: 'BRL',
      durationDays: 30,
      type: 'RECURRING',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.INVALID_SERVICE_PLAN);
    }
  });

  it('returns error for invalid plan type', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      name: 'Plan',
      description: 'Desc',
      priceAmount: 9990,
      priceCurrency: 'BRL',
      durationDays: 30,
      type: 'INVALID_TYPE',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.INVALID_SERVICE_PLAN);
    }
  });
});
