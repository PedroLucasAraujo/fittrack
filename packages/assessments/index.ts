// ── Enums ─────────────────────────────────────────────────────────────────────
export { AssessmentTemplateStatus } from './domain/enums/assessment-template-status.js';
export type { AssessmentTemplateStatus as AssessmentTemplateStatusType } from './domain/enums/assessment-template-status.js';
export { TemplateFieldType } from './domain/enums/template-field-type.js';
export type { TemplateFieldType as TemplateFieldTypeValue } from './domain/enums/template-field-type.js';

// ── Errors ────────────────────────────────────────────────────────────────────
export { AssessmentErrorCodes } from './domain/errors/assessment-error-codes.js';
export type { AssessmentErrorCode } from './domain/errors/assessment-error-codes.js';
export { InvalidAssessmentTemplateError } from './domain/errors/invalid-assessment-template-error.js';
export { InvalidAssessmentTemplateTransitionError } from './domain/errors/invalid-assessment-template-transition-error.js';
export { AssessmentTemplateNotFoundError } from './domain/errors/assessment-template-not-found-error.js';
export { AssessmentTemplateNotDraftError } from './domain/errors/assessment-template-not-draft-error.js';
export { AssessmentTemplateNotActiveError } from './domain/errors/assessment-template-not-active-error.js';
export { EmptyTemplateFieldsError } from './domain/errors/empty-template-fields-error.js';
export { TemplateFieldNotFoundError } from './domain/errors/template-field-not-found-error.js';
export { AssessmentResponseNotFoundError } from './domain/errors/assessment-response-not-found-error.js';
export { InvalidAssessmentResponseError } from './domain/errors/invalid-assessment-response-error.js';
export { DuplicateFieldResponseError } from './domain/errors/duplicate-field-response-error.js';
export { FieldValueTypeMismatchError } from './domain/errors/field-value-type-mismatch-error.js';
export { ExecutionNotConfirmedError } from './domain/errors/execution-not-confirmed-error.js';
export { DeliverableNotPhysiologicalAssessmentError } from './domain/errors/deliverable-not-physiological-assessment-error.js';

// ── Value Objects ─────────────────────────────────────────────────────────────
export { AssessmentTemplateTitle } from './domain/value-objects/assessment-template-title.js';
export { TemplateFieldLabel } from './domain/value-objects/template-field-label.js';
export type { FieldValue } from './domain/value-objects/field-value.js';
export {
  numberFieldValue,
  textFieldValue,
  booleanFieldValue,
  selectFieldValue,
  isNumberFieldValue,
  isTextFieldValue,
  isBooleanFieldValue,
  isSelectFieldValue,
  fieldValueMatchesType,
} from './domain/value-objects/field-value.js';

// ── Entities ──────────────────────────────────────────────────────────────────
export { AssessmentTemplateField } from './domain/entities/assessment-template-field.js';
export type { AssessmentTemplateFieldProps } from './domain/entities/assessment-template-field.js';
export { AssessmentFieldResponse } from './domain/entities/assessment-field-response.js';
export type { AssessmentFieldResponseProps } from './domain/entities/assessment-field-response.js';

// ── Aggregates ────────────────────────────────────────────────────────────────
export { AssessmentTemplate } from './domain/aggregates/assessment-template.js';
export type { AssessmentTemplateProps } from './domain/aggregates/assessment-template.js';
export { AssessmentResponse } from './domain/aggregates/assessment-response.js';
export type {
  AssessmentResponseProps,
  FieldResponseInput,
} from './domain/aggregates/assessment-response.js';

// ── Repositories ──────────────────────────────────────────────────────────────
export type { IAssessmentTemplateRepository } from './domain/repositories/assessment-template-repository.js';
export type { IAssessmentResponseRepository } from './domain/repositories/assessment-response-repository.js';

// ── Application Ports ─────────────────────────────────────────────────────────
export type { IExecutionPort, ExecutionView } from './application/ports/execution-port.js';
export type {
  IDeliverablePort,
  DeliverableView,
  DeliverableTemplateFieldView,
} from './application/ports/deliverable-port.js';

// ── DTOs ──────────────────────────────────────────────────────────────────────
export type { CreateAssessmentTemplateInputDTO } from './application/dtos/create-assessment-template-input-dto.js';
export type { CreateAssessmentTemplateOutputDTO } from './application/dtos/create-assessment-template-output-dto.js';
export type { AddTemplateFieldInputDTO } from './application/dtos/add-template-field-input-dto.js';
export type { AddTemplateFieldOutputDTO } from './application/dtos/add-template-field-output-dto.js';
export type { RemoveTemplateFieldInputDTO } from './application/dtos/remove-template-field-input-dto.js';
export type { RemoveTemplateFieldOutputDTO } from './application/dtos/remove-template-field-output-dto.js';
export type { ActivateAssessmentTemplateInputDTO } from './application/dtos/activate-assessment-template-input-dto.js';
export type { ActivateAssessmentTemplateOutputDTO } from './application/dtos/activate-assessment-template-output-dto.js';
export type { ArchiveAssessmentTemplateInputDTO } from './application/dtos/archive-assessment-template-input-dto.js';
export type { ArchiveAssessmentTemplateOutputDTO } from './application/dtos/archive-assessment-template-output-dto.js';
export type { RecordAssessmentResponseInputDTO } from './application/dtos/record-assessment-response-input-dto.js';
export type { RecordAssessmentResponseOutputDTO } from './application/dtos/record-assessment-response-output-dto.js';
export type { GetAssessmentResponseInputDTO } from './application/dtos/get-assessment-response-input-dto.js';
export type { GetAssessmentResponseOutputDTO } from './application/dtos/get-assessment-response-output-dto.js';
export type { ListAssessmentResponsesInputDTO } from './application/dtos/list-assessment-responses-input-dto.js';
export type { ListAssessmentResponsesOutputDTO } from './application/dtos/list-assessment-responses-output-dto.js';
export type { CompareAssessmentResponsesInputDTO } from './application/dtos/compare-assessment-responses-input-dto.js';
export type {
  CompareAssessmentResponsesOutputDTO,
  FieldComparisonDTO,
} from './application/dtos/compare-assessment-responses-output-dto.js';

// ── Use Cases ─────────────────────────────────────────────────────────────────
export { CreateAssessmentTemplate } from './application/use-cases/create-assessment-template.js';
export { AddTemplateField } from './application/use-cases/add-template-field.js';
export { RemoveTemplateField } from './application/use-cases/remove-template-field.js';
export { ActivateAssessmentTemplate } from './application/use-cases/activate-assessment-template.js';
export { ArchiveAssessmentTemplate } from './application/use-cases/archive-assessment-template.js';
export { RecordAssessmentResponse } from './application/use-cases/record-assessment-response.js';
export { GetAssessmentResponse } from './application/use-cases/get-assessment-response.js';
export { ListAssessmentResponses } from './application/use-cases/list-assessment-responses.js';
export { CompareAssessmentResponses } from './application/use-cases/compare-assessment-responses.js';
