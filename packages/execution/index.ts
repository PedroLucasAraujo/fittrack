// ── Errors ─────────────────────────────────────────────────────────────────────
export { ExecutionErrorCodes } from './domain/errors/execution-error-codes.js';
export type { ExecutionErrorCode } from './domain/errors/execution-error-codes.js';
export { InvalidExecutionError } from './domain/errors/invalid-execution-error.js';
export { ExecutionNotFoundError } from './domain/errors/execution-not-found-error.js';
export { AccessGrantInvalidError } from './domain/errors/access-grant-invalid-error.js';
export { DeliverableInactiveError } from './domain/errors/deliverable-inactive-error.js';
export { CorrectionReasonRequiredError } from './domain/errors/correction-reason-required-error.js';

// ── Value Objects ───────────────────────────────────────────────────────────────
export { ExecutionStatus } from './domain/value-objects/execution-status.js';
export type { ExecutionStatus as ExecutionStatusType } from './domain/value-objects/execution-status.js';

// ── Entities ───────────────────────────────────────────────────────────────────
export { ExecutionCorrection } from './domain/entities/execution-correction.js';
export type { ExecutionCorrectionProps } from './domain/entities/execution-correction.js';

// ── Aggregates ─────────────────────────────────────────────────────────────────
export { Execution } from './domain/aggregates/execution.js';
export type { ExecutionProps } from './domain/aggregates/execution.js';

// ── Domain Events ──────────────────────────────────────────────────────────────
export { ExecutionRecordedEvent } from './domain/events/execution-recorded-event.js';
export type { ExecutionRecordedPayload } from './domain/events/execution-recorded-event.js';
export { ExecutionCorrectionRecordedEvent } from './domain/events/execution-correction-recorded-event.js';
export type { ExecutionCorrectionRecordedPayload } from './domain/events/execution-correction-recorded-event.js';

// ── Repositories ───────────────────────────────────────────────────────────────
export type { IExecutionRepository } from './domain/repositories/execution-repository.js';

// ── Ports ──────────────────────────────────────────────────────────────────────
export type { IAccessGrantPort } from './application/ports/access-grant-port.js';
export type { IDeliverableVerificationPort } from './application/ports/deliverable-port.js';
export type { IExecutionEventPublisher } from './application/ports/execution-event-publisher-port.js';
export type { ICreateExecutionUnitOfWork } from './application/ports/create-execution-unit-of-work-port.js';

// ── DTOs ───────────────────────────────────────────────────────────────────────
export type { CreateExecutionInputDTO } from './application/dtos/create-execution-input-dto.js';
export type { CreateExecutionOutputDTO } from './application/dtos/create-execution-output-dto.js';
export type { RecordExecutionCorrectionInputDTO } from './application/dtos/record-execution-correction-input-dto.js';
export type { RecordExecutionCorrectionOutputDTO } from './application/dtos/record-execution-correction-output-dto.js';
export type { GetExecutionInputDTO } from './application/dtos/get-execution-input-dto.js';
export type { GetExecutionOutputDTO } from './application/dtos/get-execution-output-dto.js';
export type { ListExecutionsInputDTO } from './application/dtos/list-executions-input-dto.js';
export type {
  ListExecutionsOutputDTO,
  ListExecutionItemDTO,
} from './application/dtos/list-executions-output-dto.js';

// ── Use Cases ──────────────────────────────────────────────────────────────────
export { CreateExecution } from './application/use-cases/create-execution.js';
export { RecordExecutionCorrection } from './application/use-cases/record-execution-correction.js';
export { GetExecution } from './application/use-cases/get-execution.js';
export { ListExecutions } from './application/use-cases/list-executions.js';
