import { BaseDomainEvent } from '@fittrack/core';

export class BookingConfirmed extends BaseDomainEvent {
  readonly eventType = 'BookingConfirmed';
  readonly aggregateType = 'Booking';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      sessionId: string;
      clientId: string;
      professionalProfileId: string;
      logicalDay: string;
    }>,
  ) {
    super(1);
  }
}
