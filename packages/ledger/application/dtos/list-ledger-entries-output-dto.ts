import { PaginatedResult } from '@fittrack/core';
import { LedgerEntryType } from '../../domain/enums/ledger-entry-type.js';

export interface LedgerEntryDTO {
  readonly id: string;
  readonly ledgerEntryType: LedgerEntryType;
  readonly amountCents: number;
  readonly currency: string;
  readonly balanceAfterCents: number;
  readonly transactionId: string | null;
  readonly referenceEntryId: string | null;
  readonly idempotencyKey: string;
  readonly description: string;
  readonly occurredAtUtc: string;
}

export type ListLedgerEntriesOutputDTO = PaginatedResult<LedgerEntryDTO>;
