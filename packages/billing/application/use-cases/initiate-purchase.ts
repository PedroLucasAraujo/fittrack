import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Transaction } from '../../domain/aggregates/transaction.js';
import { PlatformFee } from '../../domain/value-objects/platform-fee.js';
import { ServicePlanNotFoundError } from '../../domain/errors/service-plan-not-found-error.js';
import { ServicePlanNotActiveError } from '../../domain/errors/service-plan-not-active-error.js';
import type { IServicePlanRepository } from '../../domain/repositories/service-plan-repository.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction-repository.js';
import type { InitiatePurchaseInputDTO } from '../dtos/initiate-purchase-input-dto.js';
import type { InitiatePurchaseOutputDTO } from '../dtos/initiate-purchase-output-dto.js';

/**
 * Initiates a purchase by creating a PENDING Transaction (ADR-0017 §3 Step 1).
 *
 * Validates that the ServicePlan is ACTIVE and computes the PlatformFee split.
 * No AccessGrant is created — that happens only after payment confirmation.
 */
export class InitiatePurchase {
  constructor(
    private readonly planRepository: IServicePlanRepository,
    private readonly transactionRepository: ITransactionRepository,
  ) {}

  async execute(dto: InitiatePurchaseInputDTO): Promise<DomainResult<InitiatePurchaseOutputDTO>> {
    const clientIdResult = UniqueEntityId.create(dto.clientId);
    if (clientIdResult.isLeft()) return left(clientIdResult.value);

    const profileIdResult = UniqueEntityId.create(dto.professionalProfileId);
    if (profileIdResult.isLeft()) return left(profileIdResult.value);

    const planIdResult = UniqueEntityId.create(dto.servicePlanId);
    if (planIdResult.isLeft()) return left(planIdResult.value);

    const plan = await this.planRepository.findById(planIdResult.value);
    if (!plan) {
      return left(new ServicePlanNotFoundError(dto.servicePlanId));
    }

    if (!plan.isPurchasable()) {
      return left(new ServicePlanNotActiveError(dto.servicePlanId, plan.status));
    }

    const feeResult = PlatformFee.create(plan.price, dto.feePercentage);
    if (feeResult.isLeft()) return left(feeResult.value);

    const transactionResult = Transaction.create({
      clientId: dto.clientId,
      professionalProfileId: dto.professionalProfileId,
      servicePlanId: dto.servicePlanId,
      amount: plan.price,
      platformFee: feeResult.value,
    });

    /* v8 ignore next */
    if (transactionResult.isLeft()) return left(transactionResult.value);

    const transaction = transactionResult.value;
    await this.transactionRepository.save(transaction);

    return right({
      transactionId: transaction.id,
      clientId: transaction.clientId,
      servicePlanId: transaction.servicePlanId,
      amountCents: transaction.amount.amount,
      currency: transaction.amount.currency,
      platformFeeCents: transaction.platformFee.platformAmount.amount,
      professionalAmountCents: transaction.platformFee.professionalAmount.amount,
      status: transaction.status,
      createdAtUtc: transaction.createdAtUtc.toISO(),
    });
  }
}
