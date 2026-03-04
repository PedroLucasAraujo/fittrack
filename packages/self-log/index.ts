// ── Enums ─────────────────────────────────────────────────────────────────────
export { EntrySourceType } from './domain/enums/entry-source-type.js';
export type { EntrySourceType as EntrySourceTypeValue } from './domain/enums/entry-source-type.js';

// ── Errors ────────────────────────────────────────────────────────────────────
export { SelfLogErrorCodes } from './domain/errors/self-log-error-codes.js';
export type { SelfLogErrorCode } from './domain/errors/self-log-error-codes.js';
export { InvalidSelfLogEntryError } from './domain/errors/invalid-self-log-entry-error.js';
export { InvalidSelfLogSourceError } from './domain/errors/invalid-self-log-source-error.js';
export { SelfLogAlreadyAnonymizedError } from './domain/errors/self-log-already-anonymized-error.js';
export { SelfLogEntryNotFoundError } from './domain/errors/self-log-entry-not-found-error.js';

// ── Value Objects ─────────────────────────────────────────────────────────────
export { EntrySource } from './domain/value-objects/entry-source.js';
export { SelfLogNote } from './domain/value-objects/self-log-note.js';

// ── Aggregates ────────────────────────────────────────────────────────────────
export { SelfLogEntry } from './domain/aggregates/self-log-entry.js';
export type { SelfLogEntryProps } from './domain/aggregates/self-log-entry.js';

// ── Domain Events ─────────────────────────────────────────────────────────────
export { SelfLogRecordedEvent } from './domain/events/self-log-recorded-event.js';
export type { SelfLogRecordedPayload } from './domain/events/self-log-recorded-event.js';
export { SelfLogAnonymizedEvent } from './domain/events/self-log-anonymized-event.js';
export type { SelfLogAnonymizedPayload } from './domain/events/self-log-anonymized-event.js';
export { SelfLogCorrectionProjectedEvent } from './domain/events/self-log-correction-projected-event.js';
export type { SelfLogCorrectionProjectedPayload } from './domain/events/self-log-correction-projected-event.js';

// ── Repositories ──────────────────────────────────────────────────────────────
export type { ISelfLogEntryRepository } from './domain/repositories/self-log-entry-repository.js';

// ── Application Ports ─────────────────────────────────────────────────────────
export type { ISelfLogEventPublisher } from './application/ports/self-log-event-publisher-port.js';
export type { ExecutionRecordedPayload } from './application/ports/execution-recorded-payload.js';
export type { ExecutionCorrectionRecordedPayload } from './application/ports/execution-correction-recorded-payload.js';

// ── Use Cases ─────────────────────────────────────────────────────────────────
export { RecordSelfLogEntry } from './application/use-cases/record-self-log-entry.js';
export type {
  RecordSelfLogEntryInputDTO,
  RecordSelfLogEntryOutputDTO,
} from './application/use-cases/record-self-log-entry.js';
export { ProjectExecutionToSelfLog } from './application/use-cases/project-execution-to-self-log.js';
export { AnonymizeSelfLogEntry } from './application/use-cases/anonymize-self-log-entry.js';
export type { AnonymizeSelfLogEntryInputDTO } from './application/use-cases/anonymize-self-log-entry.js';
export { HandleExecutionCorrectionProjection } from './application/use-cases/handle-execution-correction-projection.js';
