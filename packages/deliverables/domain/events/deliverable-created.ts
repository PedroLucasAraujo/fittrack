import { BaseDomainEvent } from '@fittrack/core';
import type { DeliverableType } from '../enums/deliverable-type.js';

export class DeliverableCreated extends BaseDomainEvent {
  readonly eventType = 'DeliverableCreated';
  readonly aggregateType = 'Deliverable';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      type: DeliverableType;
      title: string;
      logicalDay: string;
    }>,
  ) {
    super(1);
  }
}
