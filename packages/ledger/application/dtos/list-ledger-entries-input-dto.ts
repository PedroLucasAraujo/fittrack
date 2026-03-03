import { PageRequest } from '@fittrack/core';
import { LedgerEntryType } from '../../domain/enums/ledger-entry-type.js';

export interface ListLedgerEntriesInputDTO {
  readonly professionalProfileId: string;
  readonly page: PageRequest;
  /** Optional filter by entry type. Returns all types if omitted. */
  readonly entryType?: LedgerEntryType;
}
