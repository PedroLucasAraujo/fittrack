import { LedgerBalanceChangedEvent } from '../../domain/events/ledger-balance-changed-event.js';
import { LedgerStatusChangedEvent } from '../../domain/events/ledger-status-changed-event.js';
import { PayoutCompletedEvent } from '../../domain/events/payout-completed-event.js';
import { PlatformFeeRecordedEvent } from '../../domain/events/platform-fee-recorded-event.js';
import { RefundRecordedEvent } from '../../domain/events/refund-recorded-event.js';
import { RevenueRecordedEvent } from '../../domain/events/revenue-recorded-event.js';

/**
 * Port interface for publishing Ledger domain events.
 * Events are dispatched exclusively by Application layer (UseCase) after transaction commit.
 * ADR-0009 §4 Event Dispatch Protocol.
 */
export interface ILedgerEventPublisher {
  publishRevenueRecorded(event: RevenueRecordedEvent): Promise<void>;
  publishPlatformFeeRecorded(event: PlatformFeeRecordedEvent): Promise<void>;
  publishRefundRecorded(event: RefundRecordedEvent): Promise<void>;
  publishPayoutCompleted(event: PayoutCompletedEvent): Promise<void>;
  publishLedgerBalanceChanged(event: LedgerBalanceChangedEvent): Promise<void>;
  publishLedgerStatusChanged(event: LedgerStatusChangedEvent): Promise<void>;
}
