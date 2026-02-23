// ── Enums ─────────────────────────────────────────────────────────────────────
export { EntrySourceType } from './domain/enums/entry-source-type.js';
export type { EntrySourceType as EntrySourceTypeValue } from './domain/enums/entry-source-type.js';

// ── Errors ────────────────────────────────────────────────────────────────────
export { SelfLogErrorCodes } from './domain/errors/self-log-error-codes.js';
export type { SelfLogErrorCode } from './domain/errors/self-log-error-codes.js';
export { InvalidSelfLogEntryError } from './domain/errors/invalid-self-log-entry-error.js';
export { SelfLogAlreadyAnonymizedError } from './domain/errors/self-log-already-anonymized-error.js';

// ── Value Objects ─────────────────────────────────────────────────────────────
export { EntrySource } from './domain/value-objects/entry-source.js';
export { SelfLogNote } from './domain/value-objects/self-log-note.js';

// ── Aggregates ────────────────────────────────────────────────────────────────
export { SelfLogEntry } from './domain/aggregates/self-log-entry.js';
export type { SelfLogEntryProps } from './domain/aggregates/self-log-entry.js';

// ── Domain Events ─────────────────────────────────────────────────────────────
export { SelfLogRecordedEvent } from './domain/events/self-log-recorded-event.js';
export type { SelfLogRecordedPayload } from './domain/events/self-log-recorded-event.js';

// ── Repositories ──────────────────────────────────────────────────────────────
export type { ISelfLogEntryRepository } from './domain/repositories/self-log-entry-repository.js';

// ── Application Ports ─────────────────────────────────────────────────────────
export type { ISelfLogEventPublisher } from './application/ports/self-log-event-publisher-port.js';

// ── Use Cases ─────────────────────────────────────────────────────────────────
export { RecordSelfLogEntry } from './application/use-cases/record-self-log-entry.js';
export type {
  RecordSelfLogEntryInputDTO,
  RecordSelfLogEntryOutputDTO,
} from './application/use-cases/record-self-log-entry.js';
export { ProjectExecutionToSelfLog } from './application/use-cases/project-execution-to-self-log.js';
