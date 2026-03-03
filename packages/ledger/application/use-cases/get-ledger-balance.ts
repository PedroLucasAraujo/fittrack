import { DomainResult, left, right } from '@fittrack/core';
import { LedgerNotFoundError } from '../../domain/errors/ledger-not-found-error.js';
import { IFinancialLedgerRepository } from '../../domain/repositories/i-financial-ledger-repository.js';
import { GetLedgerBalanceInputDTO } from '../dtos/get-ledger-balance-input-dto.js';
import { GetLedgerBalanceOutputDTO } from '../dtos/get-ledger-balance-output-dto.js';

/**
 * Returns the current balance and status of a professional's FinancialLedger.
 * Tenant-isolated: returns 404 if no ledger exists for the professionalProfileId (ADR-0025).
 * Read-only; does not modify any aggregate.
 */
export class GetLedgerBalance {
  constructor(private readonly ledgerRepository: IFinancialLedgerRepository) {}

  async execute(dto: GetLedgerBalanceInputDTO): Promise<DomainResult<GetLedgerBalanceOutputDTO>> {
    const ledger = await this.ledgerRepository.findByProfessionalProfileId(
      dto.professionalProfileId,
    );

    if (!ledger) {
      return left(new LedgerNotFoundError(dto.professionalProfileId));
    }

    return right({
      ledgerId: ledger.id,
      professionalProfileId: ledger.professionalProfileId,
      currentBalanceCents: ledger.currentBalanceCents,
      currency: ledger.currency,
      isInDebt: ledger.isInDebt,
      status: ledger.status,
      lastReconciledAtUtc: ledger.lastReconciledAtUtc?.toISO() ?? null,
    });
  }
}
