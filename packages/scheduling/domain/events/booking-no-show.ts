import { BaseDomainEvent } from '@fittrack/core';

export class BookingNoShow extends BaseDomainEvent {
  readonly eventType = 'BookingNoShow';
  readonly aggregateType = 'Booking';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<Record<string, unknown>>,
  ) {
    super(1);
  }
}
