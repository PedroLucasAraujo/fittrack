import type { DeliverableType } from '../../domain/enums/deliverable-type.js';
import type { DeliverableStatus } from '../../domain/enums/deliverable-status.js';

export interface ActivateDeliverableOutputDTO {
  deliverableId: string;
  type: DeliverableType;
  status: DeliverableStatus;
  contentVersion: number;
  activatedAtUtc: string;
}
