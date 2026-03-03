import { DomainResult, left, right } from '@fittrack/core';
import { LedgerNotFoundError } from '../../domain/errors/ledger-not-found-error.js';
import { IFinancialLedgerRepository } from '../../domain/repositories/i-financial-ledger-repository.js';
import { ListLedgerEntriesInputDTO } from '../dtos/list-ledger-entries-input-dto.js';
import {
  LedgerEntryDTO,
  ListLedgerEntriesOutputDTO,
} from '../dtos/list-ledger-entries-output-dto.js';

/**
 * Returns a paginated list of LedgerEntries for a professional's FinancialLedger.
 * Tenant-isolated: returns 404 if no ledger exists (ADR-0025).
 * Read-only; does not modify any aggregate.
 */
export class ListLedgerEntries {
  constructor(private readonly ledgerRepository: IFinancialLedgerRepository) {}

  async execute(dto: ListLedgerEntriesInputDTO): Promise<DomainResult<ListLedgerEntriesOutputDTO>> {
    const ledger = await this.ledgerRepository.findByProfessionalProfileIdWithEntries(
      dto.professionalProfileId,
      dto.page,
    );

    if (!ledger) {
      return left(new LedgerNotFoundError(dto.professionalProfileId));
    }

    const entries = dto.entryType
      ? ledger.entries.filter((e) => e.ledgerEntryType === dto.entryType)
      : ledger.entries;

    const mappedEntries: LedgerEntryDTO[] = entries.map((entry) => ({
      id: entry.id,
      ledgerEntryType: entry.ledgerEntryType,
      amountCents: entry.amount.amount,
      currency: entry.amount.currency,
      balanceAfterCents: entry.balanceAfterCents,
      transactionId: entry.transactionId,
      referenceEntryId: entry.referenceEntryId,
      idempotencyKey: entry.idempotencyKey,
      description: entry.description,
      occurredAtUtc: entry.occurredAtUtc.toISO(),
    }));

    return right({
      items: mappedEntries,
      total: mappedEntries.length,
      page: dto.page.page,
      limit: dto.page.limit,
      hasNextPage: mappedEntries.length === dto.page.limit,
    });
  }
}
