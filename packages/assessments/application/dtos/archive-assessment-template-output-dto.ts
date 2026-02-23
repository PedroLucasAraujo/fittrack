import type { AssessmentTemplateStatus } from '../../domain/enums/assessment-template-status.js';

export interface ArchiveAssessmentTemplateOutputDTO {
  assessmentTemplateId: string;
  status: AssessmentTemplateStatus;
  archivedAtUtc: string;
}
