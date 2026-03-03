import { DomainEvent } from '@fittrack/core';
import { ILedgerEventPublisher } from '../../application/ports/i-ledger-event-publisher.js';
import { LedgerBalanceChangedEvent } from '../../domain/events/ledger-balance-changed-event.js';
import { LedgerStatusChangedEvent } from '../../domain/events/ledger-status-changed-event.js';
import { PayoutCompletedEvent } from '../../domain/events/payout-completed-event.js';
import { PlatformFeeRecordedEvent } from '../../domain/events/platform-fee-recorded-event.js';
import { RefundRecordedEvent } from '../../domain/events/refund-recorded-event.js';
import { RevenueRecordedEvent } from '../../domain/events/revenue-recorded-event.js';

/**
 * Test double for ILedgerEventPublisher.
 * Collects published events for assertion in unit tests.
 */
export class LedgerEventPublisherStub implements ILedgerEventPublisher {
  private readonly _publishedEvents: DomainEvent[] = [];

  async publishRevenueRecorded(event: RevenueRecordedEvent): Promise<void> {
    this._publishedEvents.push(event);
  }

  async publishPlatformFeeRecorded(event: PlatformFeeRecordedEvent): Promise<void> {
    this._publishedEvents.push(event);
  }

  async publishRefundRecorded(event: RefundRecordedEvent): Promise<void> {
    this._publishedEvents.push(event);
  }

  async publishPayoutCompleted(event: PayoutCompletedEvent): Promise<void> {
    this._publishedEvents.push(event);
  }

  async publishLedgerBalanceChanged(event: LedgerBalanceChangedEvent): Promise<void> {
    this._publishedEvents.push(event);
  }

  async publishLedgerStatusChanged(event: LedgerStatusChangedEvent): Promise<void> {
    this._publishedEvents.push(event);
  }

  get publishedEvents(): ReadonlyArray<DomainEvent> {
    return [...this._publishedEvents];
  }

  getEventsByType<T extends DomainEvent>(eventType: string): T[] {
    return this._publishedEvents.filter((e) => e.eventType === eventType) as T[];
  }

  clear(): void {
    this._publishedEvents.length = 0;
  }
}
