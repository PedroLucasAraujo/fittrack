import type { FieldValue } from '../../domain/value-objects/field-value.js';

export interface FieldResponseSummaryDTO {
  fieldId: string;
  value: FieldValue;
}

export interface AssessmentResponseSummaryDTO {
  assessmentResponseId: string;
  executionId: string;
  deliverableId: string;
  clientId: string;
  logicalDay: string;
  timezoneUsed: string;
  responseCount: number;
  responses: FieldResponseSummaryDTO[];
  createdAtUtc: string;
}

export interface ListAssessmentResponsesOutputDTO {
  professionalProfileId: string;
  clientId: string;
  total: number;
  responses: AssessmentResponseSummaryDTO[];
}
