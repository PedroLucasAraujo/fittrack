import { BaseDomainEvent } from '@fittrack/core';

export class RecurringScheduleCreated extends BaseDomainEvent {
  readonly eventType = 'RecurringScheduleCreated';
  readonly aggregateType = 'RecurringSchedule';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      sessionId: string;
      clientId: string;
      dayOfWeek: number;
      sessionCount: number;
    }>,
  ) {
    super(1);
  }
}
