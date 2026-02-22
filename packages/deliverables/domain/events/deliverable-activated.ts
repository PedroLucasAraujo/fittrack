import { BaseDomainEvent } from '@fittrack/core';
import type { DeliverableType } from '../enums/deliverable-type.js';

export class DeliverableActivated extends BaseDomainEvent {
  readonly eventType = 'DeliverableActivated';
  readonly aggregateType = 'Deliverable';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      type: DeliverableType;
      contentVersion: number;
      activatedAtUtc: string;
    }>,
  ) {
    super(1);
  }
}
