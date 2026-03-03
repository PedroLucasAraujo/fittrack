import { generateId } from '@fittrack/core';
import { FinancialLedger } from '../../domain/aggregates/financial-ledger.js';
import { LedgerStatus } from '../../domain/enums/ledger-status.js';

type LedgerOverrides = Partial<{
  id: string;
  professionalProfileId: string;
  currentBalanceCents: number;
  currency: string;
  status: LedgerStatus;
  version: number;
}>;

/**
 * Creates a new FinancialLedger via the domain factory (ACTIVE, zero balance).
 * Throws if domain invariants are violated (fail-fast in tests).
 */
export function makeNewFinancialLedger(overrides: LedgerOverrides = {}): FinancialLedger {
  const result = FinancialLedger.create({
    id: overrides.id,
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    currency: overrides.currency ?? 'BRL',
  });
  if (result.isLeft()) {
    throw new Error(`makeNewFinancialLedger failed: ${result.value.message}`);
  }
  return result.value;
}

/**
 * Reconstitutes a FinancialLedger from arbitrary state — bypasses domain factory.
 * Used to test scenarios with non-zero balances, specific statuses, or version conflicts.
 */
export function makeFinancialLedger(overrides: LedgerOverrides = {}): FinancialLedger {
  const id = overrides.id ?? generateId();
  return FinancialLedger.reconstitute(
    id,
    {
      professionalProfileId: overrides.professionalProfileId ?? generateId(),
      currentBalanceCents: overrides.currentBalanceCents ?? 0,
      currency: overrides.currency ?? 'BRL',
      status: overrides.status ?? LedgerStatus.ACTIVE,
      lastReconciledAtUtc: null,
      entries: [],
    },
    overrides.version ?? 0,
  );
}
