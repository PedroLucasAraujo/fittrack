import { LedgerStatus } from '../../domain/enums/ledger-status.js';

export interface GetLedgerBalanceOutputDTO {
  readonly ledgerId: string;
  readonly professionalProfileId: string;
  readonly currentBalanceCents: number;
  readonly currency: string;
  readonly isInDebt: boolean;
  readonly status: LedgerStatus;
  readonly lastReconciledAtUtc: string | null;
}
