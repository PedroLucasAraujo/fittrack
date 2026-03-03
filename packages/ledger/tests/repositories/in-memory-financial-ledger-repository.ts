import { PageRequest, UniqueEntityId } from '@fittrack/core';
import { FinancialLedger } from '../../domain/aggregates/financial-ledger.js';
import { IFinancialLedgerRepository } from '../../domain/repositories/i-financial-ledger-repository.js';

/**
 * In-memory implementation of IFinancialLedgerRepository for unit tests.
 * Optimistic locking (version check) is an infrastructure concern enforced by
 * the database, and is intentionally NOT simulated here — unit tests focus on
 * domain behavior, not concurrency control.
 */
export class InMemoryFinancialLedgerRepository implements IFinancialLedgerRepository {
  private readonly store = new Map<string, FinancialLedger>();

  /** Keyed by professionalProfileId for fast tenant lookup. */
  private readonly byProfessionalId = new Map<string, string>(); // profileId → ledgerId

  async findById(id: UniqueEntityId): Promise<FinancialLedger | null> {
    return this.store.get(id.value) ?? null;
  }

  async findByProfessionalProfileId(
    professionalProfileId: string,
  ): Promise<FinancialLedger | null> {
    const ledgerId = this.byProfessionalId.get(professionalProfileId);
    if (!ledgerId) return null;
    return this.store.get(ledgerId) ?? null;
  }

  async findByProfessionalProfileIdWithEntries(
    professionalProfileId: string,
    _page: PageRequest,
  ): Promise<FinancialLedger | null> {
    // In-memory: entries are always available; pagination is ignored in unit tests.
    return this.findByProfessionalProfileId(professionalProfileId);
  }

  async save(ledger: FinancialLedger): Promise<void> {
    this.store.set(ledger.id, ledger);
    this.byProfessionalId.set(ledger.professionalProfileId, ledger.id);
  }

  /** Test helper: returns number of stored ledgers. */
  count(): number {
    return this.store.size;
  }

  /** Test helper: clears all stored ledgers. */
  clear(): void {
    this.store.clear();
    this.byProfessionalId.clear();
  }
}
