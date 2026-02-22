import type { DeliverableType } from '../../domain/enums/deliverable-type.js';
import type { DeliverableStatus } from '../../domain/enums/deliverable-status.js';

export interface CreateDeliverableOutputDTO {
  deliverableId: string;
  professionalProfileId: string;
  title: string;
  type: DeliverableType;
  status: DeliverableStatus;
  contentVersion: number;
  description: string | null;
  exerciseCount: number;
  logicalDay: string;
  timezoneUsed: string;
  createdAtUtc: string;
}
