import { BaseDomainEvent } from '@fittrack/core';

export class BookingCancelled extends BaseDomainEvent {
  readonly eventType = 'BookingCancelled';
  readonly aggregateType = 'Booking';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      reason: string;
      cancelledBy: string;
    }>,
  ) {
    super(1);
  }
}
