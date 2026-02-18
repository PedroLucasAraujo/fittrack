import { BaseDomainEvent } from '@fittrack/core';

export class BookingCompleted extends BaseDomainEvent {
  readonly eventType = 'BookingCompleted';
  readonly aggregateType = 'Booking';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      executionId: string;
    }>,
  ) {
    super(1);
  }
}
