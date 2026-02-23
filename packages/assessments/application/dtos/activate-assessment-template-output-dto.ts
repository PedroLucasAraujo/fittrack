import type { AssessmentTemplateStatus } from '../../domain/enums/assessment-template-status.js';

export interface ActivateAssessmentTemplateOutputDTO {
  assessmentTemplateId: string;
  status: AssessmentTemplateStatus;
  contentVersion: number;
  fieldCount: number;
  activatedAtUtc: string;
}
