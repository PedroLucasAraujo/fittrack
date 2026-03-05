import type { DeliverableType } from '../../domain/enums/deliverable-type.js';
import type { TemplateStatus } from '../../domain/enums/template-status.js';

export interface DeliverableTemplateOutputDTO {
  templateId: string;
  professionalProfileId: string;
  name: string;
  description: string | null;
  type: DeliverableType;
  status: TemplateStatus;
  version: number;
  previousVersionId: string | null;
  usageCount: number;
  tags: string[];
  createdAtUtc: string;
  updatedAtUtc: string;
  activatedAtUtc: string | null;
  archivedAtUtc: string | null;
}
