import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ConfirmPayment } from '../../../application/use-cases/confirm-payment.js';
import { InMemoryTransactionRepository } from '../../repositories/in-memory-transaction-repository.js';
import { InMemoryServicePlanRepository } from '../../repositories/in-memory-service-plan-repository.js';
import { InMemoryAccessGrantRepository } from '../../repositories/in-memory-access-grant-repository.js';
import { InMemoryBillingEventPublisherStub } from '../../stubs/in-memory-billing-event-publisher-stub.js';
import { makeTransaction } from '../../factories/make-transaction.js';
import { makeServicePlan } from '../../factories/make-service-plan.js';
import { TransactionStatus } from '../../../domain/enums/transaction-status.js';
import { AccessGrantStatus } from '../../../domain/enums/access-grant-status.js';
import { ServicePlanStatus } from '../../../domain/enums/service-plan-status.js';
import { BillingErrorCodes } from '../../../domain/errors/billing-error-codes.js';

describe('ConfirmPayment', () => {
  let transactionRepository: InMemoryTransactionRepository;
  let planRepository: InMemoryServicePlanRepository;
  let accessGrantRepository: InMemoryAccessGrantRepository;
  let eventPublisher: InMemoryBillingEventPublisherStub;
  let sut: ConfirmPayment;

  beforeEach(() => {
    transactionRepository = new InMemoryTransactionRepository();
    planRepository = new InMemoryServicePlanRepository();
    accessGrantRepository = new InMemoryAccessGrantRepository();
    eventPublisher = new InMemoryBillingEventPublisherStub();
    sut = new ConfirmPayment(
      transactionRepository,
      planRepository,
      accessGrantRepository,
      eventPublisher,
    );
  });

  it('confirms payment and creates AccessGrant', async () => {
    const plan = makeServicePlan({
      status: ServicePlanStatus.ACTIVE,
      durationDays: 30,
      sessionAllotment: 12,
    });
    planRepository.items.push(plan);

    const tx = makeTransaction({
      status: TransactionStatus.PENDING,
      servicePlanId: plan.id,
    });
    transactionRepository.items.push(tx);

    const result = await sut.execute({
      transactionId: tx.id,
      gatewayTransactionId: 'gw-123',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.transactionStatus).toBe(TransactionStatus.CONFIRMED);
      expect(output.accessGrantStatus).toBe(AccessGrantStatus.ACTIVE);
      expect(output.validFrom).toBeDefined();
      expect(output.validUntil).toBeDefined();
    }
  });

  it('persists both transaction and access grant', async () => {
    const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
    planRepository.items.push(plan);

    const tx = makeTransaction({
      status: TransactionStatus.PENDING,
      servicePlanId: plan.id,
    });
    transactionRepository.items.push(tx);

    await sut.execute({
      transactionId: tx.id,
      gatewayTransactionId: 'gw-456',
    });

    expect(accessGrantRepository.items).toHaveLength(1);
    const grant = accessGrantRepository.items[0]!;
    expect(grant.transactionId).toBe(tx.id);
    expect(grant.clientId).toBe(tx.clientId);
    expect(grant.servicePlanId).toBe(plan.id);
    expect(grant.sessionAllotment).toBe(plan.sessionAllotment);
  });

  it('sets validUntil based on plan durationDays', async () => {
    const plan = makeServicePlan({
      status: ServicePlanStatus.ACTIVE,
      durationDays: 60,
    });
    planRepository.items.push(plan);

    const tx = makeTransaction({
      status: TransactionStatus.PENDING,
      servicePlanId: plan.id,
    });
    transactionRepository.items.push(tx);

    const result = await sut.execute({
      transactionId: tx.id,
      gatewayTransactionId: 'gw-789',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const validFrom = new Date(result.value.validFrom);
      const validUntil = new Date(result.value.validUntil!);
      const diffDays = Math.round(
        (validUntil.getTime() - validFrom.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(60);
    }
  });

  it('returns error if transaction not found', async () => {
    const result = await sut.execute({
      transactionId: generateId(),
      gatewayTransactionId: 'gw-abc',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.TRANSACTION_NOT_FOUND);
    }
  });

  it('returns error if service plan not found', async () => {
    const tx = makeTransaction({
      status: TransactionStatus.PENDING,
      servicePlanId: generateId(),
    });
    transactionRepository.items.push(tx);

    const result = await sut.execute({
      transactionId: tx.id,
      gatewayTransactionId: 'gw-no-plan',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.SERVICE_PLAN_NOT_FOUND);
    }
  });

  it('returns error if transaction is not PENDING', async () => {
    const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
    planRepository.items.push(plan);

    const tx = makeTransaction({
      status: TransactionStatus.CONFIRMED,
      servicePlanId: plan.id,
    });
    transactionRepository.items.push(tx);

    const result = await sut.execute({
      transactionId: tx.id,
      gatewayTransactionId: 'gw-def',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(BillingErrorCodes.INVALID_TRANSACTION_TRANSITION);
    }
  });

  it('returns error if transactionId is not a valid UUID', async () => {
    const result = await sut.execute({
      transactionId: 'not-a-uuid',
      gatewayTransactionId: 'gw-xyz',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('publishes PurchaseCompleted and AccessGrantCreated events on success', async () => {
    const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
    planRepository.items.push(plan);

    const tx = makeTransaction({
      status: TransactionStatus.PENDING,
      servicePlanId: plan.id,
    });
    transactionRepository.items.push(tx);

    await sut.execute({ transactionId: tx.id, gatewayTransactionId: 'gw-evt' });

    expect(eventPublisher.publishedPurchaseCompleted).toHaveLength(1);
    expect(eventPublisher.publishedPurchaseCompleted[0]!.aggregateId).toBe(tx.id);
    expect(eventPublisher.publishedAccessGrantCreated).toHaveLength(1);
  });

  it('does not publish events when transaction is not found', async () => {
    await sut.execute({ transactionId: generateId(), gatewayTransactionId: 'gw-err' });

    expect(eventPublisher.publishedPurchaseCompleted).toHaveLength(0);
    expect(eventPublisher.publishedAccessGrantCreated).toHaveLength(0);
  });

  it('does not publish events when transaction transition fails', async () => {
    const plan = makeServicePlan({ status: ServicePlanStatus.ACTIVE });
    planRepository.items.push(plan);

    const tx = makeTransaction({
      status: TransactionStatus.CONFIRMED,
      servicePlanId: plan.id,
    });
    transactionRepository.items.push(tx);

    await sut.execute({ transactionId: tx.id, gatewayTransactionId: 'gw-fail' });

    expect(eventPublisher.publishedPurchaseCompleted).toHaveLength(0);
    expect(eventPublisher.publishedAccessGrantCreated).toHaveLength(0);
  });
});
