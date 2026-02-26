import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ChargebackRegistered } from '../../domain/events/chargeback-registered.js';
import { AccessGrantRevoked } from '../../domain/events/access-grant-revoked.js';
import { TransactionNotFoundError } from '../../domain/errors/transaction-not-found-error.js';
import { AccessGrantNotFoundError } from '../../domain/errors/access-grant-not-found-error.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction-repository.js';
import type { IAccessGrantRepository } from '../../domain/repositories/access-grant-repository.js';
import type { IBillingEventPublisher } from '../ports/billing-event-publisher-port.js';
import type { RegisterChargebackInputDTO } from '../dtos/register-chargeback-input-dto.js';
import type { RegisterChargebackOutputDTO } from '../dtos/register-chargeback-output-dto.js';

/**
 * Registers a chargeback on a confirmed Transaction (ADR-0020).
 *
 * 1. Transaction CONFIRMED → CHARGEBACK
 * 2. AccessGrant → REVOKED (reason: "CHARGEBACK")
 *
 * Per ADR-0005 and ADR-0020: chargeback NEVER deletes or modifies any
 * Execution record. It only revokes future access.
 *
 * NOTE: ADR-0003 — This use case persists Transaction and AccessGrant in the
 * same operation (two aggregate roots). This is a documented exception while
 * the outbox/unit-of-work infrastructure is not yet available. Events are
 * dispatched post-save via IBillingEventPublisher (ADR-0009 §4).
 */
export class RegisterChargeback {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly accessGrantRepository: IAccessGrantRepository,
    private readonly eventPublisher: IBillingEventPublisher,
  ) {}

  async execute(
    dto: RegisterChargebackInputDTO,
  ): Promise<DomainResult<RegisterChargebackOutputDTO>> {
    const txIdResult = UniqueEntityId.create(dto.transactionId);
    if (txIdResult.isLeft()) return left(txIdResult.value);

    const transaction = await this.transactionRepository.findById(txIdResult.value);
    if (!transaction) {
      return left(new TransactionNotFoundError(dto.transactionId));
    }

    const chargebackResult = transaction.registerChargeback();
    if (chargebackResult.isLeft()) return left(chargebackResult.value);

    const grant = await this.accessGrantRepository.findByTransactionId(transaction.id);
    if (!grant) {
      return left(new AccessGrantNotFoundError(dto.transactionId));
    }

    const revokeResult = grant.revoke('CHARGEBACK');
    /* v8 ignore next */
    if (revokeResult.isLeft()) return left(revokeResult.value);

    await this.transactionRepository.save(transaction);
    await this.accessGrantRepository.save(grant);

    const revokedAtUtc = grant.revokedAtUtc;
    /* v8 ignore next */
    if (!revokedAtUtc) throw new Error('Invariant: revokedAtUtc must be set after revoke()');

    await this.eventPublisher.publishChargebackRegistered(
      new ChargebackRegistered(transaction.id, transaction.professionalProfileId, {
        clientId: transaction.clientId,
        servicePlanId: transaction.servicePlanId,
        amountCents: transaction.amount.amount,
        currency: transaction.amount.currency,
      }),
    );

    await this.eventPublisher.publishAccessGrantRevoked(
      new AccessGrantRevoked(grant.id, grant.professionalProfileId, {
        reason: 'CHARGEBACK',
        transactionId: grant.transactionId,
      }),
    );

    return right({
      transactionId: transaction.id,
      transactionStatus: transaction.status,
      accessGrantId: grant.id,
      accessGrantStatus: grant.status,
      revokedAtUtc: revokedAtUtc.toISO(),
    });
  }
}
