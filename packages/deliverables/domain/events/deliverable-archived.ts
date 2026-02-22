import { BaseDomainEvent } from '@fittrack/core';
import type { DeliverableType } from '../enums/deliverable-type.js';

export class DeliverableArchived extends BaseDomainEvent {
  readonly eventType = 'DeliverableArchived';
  readonly aggregateType = 'Deliverable';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      type: DeliverableType;
      archivedAtUtc: string;
    }>,
  ) {
    super(1);
  }
}
