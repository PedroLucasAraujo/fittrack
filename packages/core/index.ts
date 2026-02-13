// ── Either / Result ───────────────────────────────────────────────────────────
export type { Either } from './either/either';
export { Left, Right, left, right } from './either/either';
export type { DomainResult } from './either/domain-result';

// ── Errors ────────────────────────────────────────────────────────────────────
export { DomainError } from './errors/domain-error';
export { DomainInvariantError } from './errors/domain-invariant-error';
export { ConcurrencyConflictError } from './errors/concurrency-conflict-error';
export { ErrorCodes } from './errors/error-codes';
export type { ErrorCode } from './errors/error-codes';

// ── Domain Events (ADR-0009) ──────────────────────────────────────────────────
export type { DomainEvent } from './events/domain-event';
export { BaseDomainEvent } from './events/base-domain-event';

// ── Entities ──────────────────────────────────────────────────────────────────
export { BaseEntity } from './entities/base-entity';
export { AggregateRoot } from './entities/aggregate-root';
export { UniqueEntityId } from './entities/unique-entity-id';

// ── Value Objects ─────────────────────────────────────────────────────────────
export { ValueObject } from './value-objects/value-object';
export { LogicalDay } from './value-objects/logical-day';
export { UTCDateTime } from './value-objects/utc-date-time';
export { Money } from './value-objects/money';

// ── Collections ───────────────────────────────────────────────────────────────
export { WatchedList } from './collections/watched-list';

// ── Repositories ──────────────────────────────────────────────────────────────
export type { IRepository } from './repositories/i-repository';

// ── Pagination ────────────────────────────────────────────────────────────────
export type { PageRequest, PaginatedResult } from './types/pagination';

// ── Utilities ─────────────────────────────────────────────────────────────────
export { generateId } from './utils/generate-id';

// ── Invariant assertion ───────────────────────────────────────────────────────
export { invariant } from './invariants/invariant';
