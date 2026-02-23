import type { FieldValue } from '../../domain/value-objects/field-value.js';

export interface FieldResponseOutputDTO {
  fieldId: string;
  value: FieldValue;
}

export interface GetAssessmentResponseOutputDTO {
  assessmentResponseId: string;
  executionId: string;
  deliverableId: string;
  professionalProfileId: string;
  clientId: string;
  logicalDay: string;
  timezoneUsed: string;
  responseCount: number;
  responses: FieldResponseOutputDTO[];
  createdAtUtc: string;
}
