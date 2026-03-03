// ── Enums ────────────────────────────────────────────────────────────────────
export { LedgerEntryType } from './domain/enums/ledger-entry-type.js';
export type { LedgerEntryType as LedgerEntryTypeValue } from './domain/enums/ledger-entry-type.js';
export { LedgerStatus } from './domain/enums/ledger-status.js';
export type { LedgerStatus as LedgerStatusValue } from './domain/enums/ledger-status.js';

// ── Errors ───────────────────────────────────────────────────────────────────
export { LedgerErrorCodes } from './domain/errors/ledger-error-codes.js';
export type { LedgerErrorCode } from './domain/errors/ledger-error-codes.js';
export { LedgerNotFoundError } from './domain/errors/ledger-not-found-error.js';
export { LedgerFrozenError } from './domain/errors/ledger-frozen-error.js';
export { LedgerUnderReviewError } from './domain/errors/ledger-under-review-error.js';
export { InsufficientBalanceError } from './domain/errors/insufficient-balance-error.js';
export { InvalidLedgerStatusTransitionError } from './domain/errors/invalid-ledger-status-transition-error.js';

// ── Domain Event Contracts ───────────────────────────────────────────────────
// Events are dispatched explicitly by the Application layer (UseCases),
// NOT by aggregates or repositories. See ADR-0009 Official Domain Events Policy.
export { RevenueRecordedEvent } from './domain/events/revenue-recorded-event.js';
export type { RevenueRecordedPayload } from './domain/events/revenue-recorded-event.js';
export { PlatformFeeRecordedEvent } from './domain/events/platform-fee-recorded-event.js';
export type { PlatformFeeRecordedPayload } from './domain/events/platform-fee-recorded-event.js';
export { RefundRecordedEvent } from './domain/events/refund-recorded-event.js';
export type { RefundRecordedPayload } from './domain/events/refund-recorded-event.js';
export { PayoutCompletedEvent } from './domain/events/payout-completed-event.js';
export type { PayoutCompletedPayload } from './domain/events/payout-completed-event.js';
export { LedgerBalanceChangedEvent } from './domain/events/ledger-balance-changed-event.js';
export type { LedgerBalanceChangedPayload } from './domain/events/ledger-balance-changed-event.js';
export { LedgerStatusChangedEvent } from './domain/events/ledger-status-changed-event.js';
export type { LedgerStatusChangedPayload } from './domain/events/ledger-status-changed-event.js';

// ── Repository Interfaces ────────────────────────────────────────────────────
export type { IFinancialLedgerRepository } from './domain/repositories/i-financial-ledger-repository.js';

// ── Application — Ports ──────────────────────────────────────────────────────
export type { ILedgerEventPublisher } from './application/ports/i-ledger-event-publisher.js';

// ── Application — Input DTOs ─────────────────────────────────────────────────
export type { ProcessExecutionRevenueInputDTO } from './application/dtos/process-execution-revenue-input-dto.js';
export type { ProcessChargebackInputDTO } from './application/dtos/process-chargeback-input-dto.js';
export type { RecordPayoutInputDTO } from './application/dtos/record-payout-input-dto.js';
export type { GetLedgerBalanceInputDTO } from './application/dtos/get-ledger-balance-input-dto.js';
export type { ListLedgerEntriesInputDTO } from './application/dtos/list-ledger-entries-input-dto.js';
export type { LedgerStatusTransitionInputDTO } from './application/dtos/ledger-status-transition-input-dto.js';
export type { RecordAdjustmentInputDTO } from './application/dtos/record-adjustment-input-dto.js';

// ── Application — Output DTOs ────────────────────────────────────────────────
export type { ProcessExecutionRevenueOutputDTO } from './application/dtos/process-execution-revenue-output-dto.js';
export type { ProcessChargebackOutputDTO } from './application/dtos/process-chargeback-output-dto.js';
export type { RecordPayoutOutputDTO } from './application/dtos/record-payout-output-dto.js';
export type { GetLedgerBalanceOutputDTO } from './application/dtos/get-ledger-balance-output-dto.js';
export type {
  ListLedgerEntriesOutputDTO,
  LedgerEntryDTO,
} from './application/dtos/list-ledger-entries-output-dto.js';
export type { LedgerStatusTransitionOutputDTO } from './application/dtos/ledger-status-transition-output-dto.js';
export type { RecordAdjustmentOutputDTO } from './application/dtos/record-adjustment-output-dto.js';

// ── Application — Use Cases ──────────────────────────────────────────────────
export { ProcessExecutionRevenue } from './application/use-cases/process-execution-revenue.js';
export { ProcessChargeback } from './application/use-cases/process-chargeback.js';
export { RecordPayout } from './application/use-cases/record-payout.js';
export { GetLedgerBalance } from './application/use-cases/get-ledger-balance.js';
export { ListLedgerEntries } from './application/use-cases/list-ledger-entries.js';
export { FreezeFinancialLedger } from './application/use-cases/freeze-financial-ledger.js';
export { UnfreezeFinancialLedger } from './application/use-cases/unfreeze-financial-ledger.js';
export { MarkLedgerUnderReview } from './application/use-cases/mark-ledger-under-review.js';
export { ClearLedgerReview } from './application/use-cases/clear-ledger-review.js';
export { RecordAdjustment } from './application/use-cases/record-adjustment.js';
