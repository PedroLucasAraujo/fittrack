import { BaseDomainEvent } from '@fittrack/core';

export class BookingCancelledBySystem extends BaseDomainEvent {
  readonly eventType = 'BookingCancelledBySystem';
  readonly aggregateType = 'Booking';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      reason: string;
    }>,
  ) {
    super(1);
  }
}
