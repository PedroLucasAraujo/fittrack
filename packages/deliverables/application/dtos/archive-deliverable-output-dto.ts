import type { DeliverableType } from '../../domain/enums/deliverable-type.js';
import type { DeliverableStatus } from '../../domain/enums/deliverable-status.js';

export interface ArchiveDeliverableOutputDTO {
  deliverableId: string;
  type: DeliverableType;
  status: DeliverableStatus;
  archivedAtUtc: string;
}
