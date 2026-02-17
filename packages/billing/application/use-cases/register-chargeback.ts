import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { TransactionNotFoundError } from '../../domain/errors/transaction-not-found-error.js';
import { AccessGrantNotFoundError } from '../../domain/errors/access-grant-not-found-error.js';
import type { ITransactionRepository } from '../../domain/repositories/transaction-repository.js';
import type { IAccessGrantRepository } from '../../domain/repositories/access-grant-repository.js';
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
 */
export class RegisterChargeback {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly accessGrantRepository: IAccessGrantRepository,
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

    return right({
      transactionId: transaction.id,
      transactionStatus: transaction.status,
      accessGrantId: grant.id,
      accessGrantStatus: grant.status,
      revokedAtUtc: grant.revokedAtUtc!.toISO(),
    });
  }
}
