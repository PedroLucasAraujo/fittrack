import { LedgerStatus } from '../../domain/enums/ledger-status.js';

export interface LedgerStatusTransitionOutputDTO {
  ledgerId: string;
  previousStatus: LedgerStatus;
  newStatus: LedgerStatus;
}
