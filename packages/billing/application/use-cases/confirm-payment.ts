import { left, right, UniqueEntityId, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AccessGrant } from '../../domain/aggregates/access-grant.js';
import { TransactionNotFoundError } from '../../domain/errors/transaction-not-found-error.js';
import { ServicePlanNotFoundError } from '../../domain/errors/service-plan-not-found-error.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction-repository.js';
import type { IServicePlanRepository } from '../../domain/repositories/service-plan-repository.js';
import type { IAccessGrantRepository } from '../../domain/repositories/access-grant-repository.js';
import type { ConfirmPaymentInputDTO } from '../dtos/confirm-payment-input-dto.js';
import type { ConfirmPaymentOutputDTO } from '../dtos/confirm-payment-output-dto.js';

/**
 * Confirms a payment and creates an AccessGrant (ADR-0017 §3 Steps 3–4).
 *
 * This is the core subscription-first operation:
 * 1. Transaction PENDING → CONFIRMED
 * 2. AccessGrant created with ACTIVE status
 *
 * Per ADR-0017: AccessGrant is created only after Transaction is CONFIRMED.
 *
 * TODO: ADR-0047 — This use case modifies Transaction and creates AccessGrant
 * in the same operation (two aggregate roots). Split into two domain transactions
 * via PurchaseCompleted event when outbox infrastructure is available.
 */
export class ConfirmPayment {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly planRepository: IServicePlanRepository,
    private readonly accessGrantRepository: IAccessGrantRepository,
  ) {}

  async execute(dto: ConfirmPaymentInputDTO): Promise<DomainResult<ConfirmPaymentOutputDTO>> {
    const txIdResult = UniqueEntityId.create(dto.transactionId);
    if (txIdResult.isLeft()) return left(txIdResult.value);

    const transaction = await this.transactionRepository.findById(txIdResult.value);
    if (!transaction) {
      return left(new TransactionNotFoundError(dto.transactionId));
    }

    const confirmResult = transaction.confirm(dto.gatewayTransactionId);
    if (confirmResult.isLeft()) return left(confirmResult.value);

    const planIdResult = UniqueEntityId.create(transaction.servicePlanId);
    /* v8 ignore next */
    if (planIdResult.isLeft()) return left(planIdResult.value);

    const plan = await this.planRepository.findById(planIdResult.value);
    if (!plan) {
      return left(new ServicePlanNotFoundError(transaction.servicePlanId));
    }

    const validFrom = UTCDateTime.now();
    const validUntilDate = new Date(validFrom.toISO());
    validUntilDate.setUTCDate(validUntilDate.getUTCDate() + plan.durationDays);
    const validUntilResult = UTCDateTime.from(validUntilDate);
    /* v8 ignore next */
    if (validUntilResult.isLeft()) return left(validUntilResult.value);

    const grantResult = AccessGrant.create({
      clientId: transaction.clientId,
      professionalProfileId: transaction.professionalProfileId,
      servicePlanId: transaction.servicePlanId,
      transactionId: transaction.id,
      sessionAllotment: plan.sessionAllotment,
      validFrom,
      validUntil: validUntilResult.value,
    });

    /* v8 ignore next */
    if (grantResult.isLeft()) return left(grantResult.value);

    const grant = grantResult.value;

    await this.transactionRepository.save(transaction);
    await this.accessGrantRepository.save(grant);

    return right({
      transactionId: transaction.id,
      transactionStatus: transaction.status,
      accessGrantId: grant.id,
      accessGrantStatus: grant.status,
      validFrom: grant.validFrom.toISO(),
      /* v8 ignore next */
      validUntil: grant.validUntil?.toISO() ?? null,
    });
  }
}
