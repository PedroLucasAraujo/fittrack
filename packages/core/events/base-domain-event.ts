import type { DomainEvent } from './domain-event';
import { generateId } from '../utils/generate-id';

/**
 * Abstract base class for concrete domain event implementations.
 *
 * Reduces boilerplate by auto-filling `eventId` and `occurredAtUtc` at
 * construction time. Subclasses must implement the four aggregate-specific
 * fields: `eventType`, `aggregateId`, `aggregateType`, `tenantId`, and
 * `payload`.
 *
 * ## Usage
 *
 * ```typescript
 * export class ExecutionRecorded extends BaseDomainEvent {
 *   readonly eventType = 'ExecutionRecorded';
 *   readonly eventVersion = 1;
 *
 *   constructor(
 *     readonly aggregateId: string,
 *     readonly aggregateType: string,
 *     readonly tenantId: string,
 *     readonly payload: Readonly<Record<string, unknown>>,
 *   ) {
 *     super();
 *   }
 * }
 * ```
 *
 * ## Event naming (ADR-0009 §2)
 *
 * `eventType` must be PascalCase past-tense (e.g., "ExecutionRecorded").
 * Imperative names ("RecordExecution") are prohibited.
 *
 * ## Versioning (ADR-0009 §5)
 *
 * `eventVersion` defaults to `1`. Increment it on every breaking payload
 * change (field removal or rename). Non-breaking additions may share the
 * same version.
 */
export abstract class BaseDomainEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredAtUtc: string;
  readonly eventVersion: number;

  abstract readonly eventType: string;
  abstract readonly aggregateId: string;
  abstract readonly aggregateType: string;
  abstract readonly tenantId: string;
  abstract readonly payload: Readonly<Record<string, unknown>>;

  protected constructor(eventVersion: number = 1) {
    this.eventId = generateId();
    this.occurredAtUtc = new Date().toISOString();
    this.eventVersion = eventVersion;
  }
}
