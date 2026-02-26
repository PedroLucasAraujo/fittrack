import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { PaymentRefunded } from '../../domain/events/payment-refunded.js';
import { TransactionNotFoundError } from '../../domain/errors/transaction-not-found-error.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction-repository.js';
import type { IBillingEventPublisher } from '../ports/billing-event-publisher-port.js';
import type { RefundPaymentInputDTO } from '../dtos/refund-payment-input-dto.js';
import type { RefundPaymentOutputDTO } from '../dtos/refund-payment-output-dto.js';

/**
 * Refunds a confirmed Transaction (ADR-0020 PERIOD_PRESERVE policy).
 *
 * ## Policy (ADR-0020)
 *
 * The default refund policy is PERIOD_PRESERVE:
 * - Transaction CONFIRMED → REFUNDED
 * - AccessGrant remains ACTIVE until its natural expiry (validUntil / session exhaustion)
 * - Past Execution records are permanently retained (ADR-0005)
 *
 * This is intentionally less destructive than a chargeback. A chargeback
 * (RegisterChargeback use case) additionally revokes the AccessGrant.
 *
 * Tenant isolation (ADR-0025): professionalProfileId is sourced from the
 * operator's JWT and must match the transaction's owner.
 */
export class RefundPayment {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly eventPublisher: IBillingEventPublisher,
  ) {}

  async execute(dto: RefundPaymentInputDTO): Promise<DomainResult<RefundPaymentOutputDTO>> {
    const txIdResult = UniqueEntityId.create(dto.transactionId);
    if (txIdResult.isLeft()) return left(txIdResult.value);

    const transaction = await this.transactionRepository.findById(txIdResult.value);

    // Tenant isolation: treat cross-tenant as not-found (ADR-0025)
    if (!transaction || transaction.professionalProfileId !== dto.professionalProfileId) {
      return left(new TransactionNotFoundError(dto.transactionId));
    }

    const refundResult = transaction.refund();
    if (refundResult.isLeft()) return left(refundResult.value);

    await this.transactionRepository.save(transaction);

    const refundedAtUtc = transaction.refundedAtUtc;
    /* v8 ignore next */
    if (!refundedAtUtc) throw new Error('Invariant: refundedAtUtc must be set after refund()');

    await this.eventPublisher.publishPaymentRefunded(
      new PaymentRefunded(transaction.id, transaction.professionalProfileId, {
        clientId: transaction.clientId,
        servicePlanId: transaction.servicePlanId,
        amountCents: transaction.amount.amount,
        currency: transaction.amount.currency,
      }),
    );

    return right({
      transactionId: transaction.id,
      transactionStatus: transaction.status,
      refundedAtUtc: refundedAtUtc.toISO(),
    });
  }
}
