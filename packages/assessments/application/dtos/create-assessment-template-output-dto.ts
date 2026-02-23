import type { AssessmentTemplateStatus } from '../../domain/enums/assessment-template-status.js';

export interface CreateAssessmentTemplateOutputDTO {
  assessmentTemplateId: string;
  professionalProfileId: string;
  title: string;
  description: string | null;
  status: AssessmentTemplateStatus;
  contentVersion: number;
  logicalDay: string;
  timezoneUsed: string;
  createdAtUtc: string;
}
