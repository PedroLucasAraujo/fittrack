import { IRepository, PageRequest } from '@fittrack/core';
import { FinancialLedger } from '../aggregates/financial-ledger.js';

/**
 * Repository interface for FinancialLedger aggregate root.
 * ADR-0004: Repository interface in domain layer; implementation in infrastructure.
 * ADR-0047: IFinancialLedgerRepository — one per aggregate root.
 * ADR-0021 §11: Two load modes (mutation path vs query path).
 */
export interface IFinancialLedgerRepository extends IRepository<FinancialLedger> {
  /**
   * Mutation-path load: loads FinancialLedger header only (balance, status, version).
   * `ledger.entries` will be empty. Optimized for high-frequency write operations.
   * Returns null if no ledger exists for this professional (create on first use).
   */
  findByProfessionalProfileId(professionalProfileId: string): Promise<FinancialLedger | null>;

  /**
   * Query-path load: loads FinancialLedger header + paginated LedgerEntries.
   * Used by GetLedgerBalance and ListLedgerEntries use cases.
   */
  findByProfessionalProfileIdWithEntries(
    professionalProfileId: string,
    page: PageRequest,
  ): Promise<FinancialLedger | null>;

  /**
   * Persists the aggregate:
   * - Upserts the FinancialLedger header (balance, status, version with optimistic locking).
   * - Inserts only `ledger.getNewEntries()` as new LedgerEntry rows.
   * Throws ConcurrencyConflictError if version mismatch (optimistic locking).
   */
  save(ledger: FinancialLedger): Promise<void>;
}
