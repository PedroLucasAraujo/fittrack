import { UTCDateTime, LogicalDay, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { ExecutionRecordedPayload } from '../ports/execution-recorded-payload.js';
import { SelfLogEntry } from '../../domain/aggregates/self-log-entry.js';
import { EntrySource } from '../../domain/value-objects/entry-source.js';
import { SelfLogRecordedEvent } from '../../domain/events/self-log-recorded-event.js';
import { InvalidSelfLogEntryError } from '../../domain/errors/invalid-self-log-entry-error.js';
import type { ISelfLogEntryRepository } from '../../domain/repositories/self-log-entry-repository.js';
import type { ISelfLogEventPublisher } from '../ports/self-log-event-publisher-port.js';

/**
 * Projects a confirmed Execution into the SelfLog context (source=EXECUTION).
 *
 * Triggered by the `ExecutionRecorded` domain event via an event-driven handler
 * (ADR-0016 eventual consistency — ≤5min target for read model projections).
 *
 * ## Idempotency (ADR-0007)
 *
 * Before creating a new SelfLogEntry, checks whether a projection already
 * exists for the given executionId. If so, returns `right(undefined)` without
 * side effects. This guards against duplicate projections on at-least-once
 * event delivery (ADR-0016 §3).
 *
 * ## Consistency boundary (ADR-0003)
 *
 * This handler executes in its own transaction scope — separate from the
 * Execution creation transaction. SelfLog and Execution are independent
 * aggregates (ADR-0047).
 *
 * ## Non-authoritative (ADR-0005, ADR-0014)
 *
 * The projected SelfLogEntry reflects Execution data but never supersedes
 * or alters the Execution record. If the Execution is later corrected via
 * `ExecutionCorrectionRecorded`, a separate handler must be implemented to
 * update the projection (not covered in this initial module).
 *
 * ## LGPD (ADR-0037)
 *
 * No health data is stored on source=EXECUTION entries in this initial
 * projection. Only IDs and temporal fields are projected. Health metrics
 * derived from Execution are handled by the Metrics context (ADR-0014,
 * ADR-0043).
 */
export class ProjectExecutionToSelfLog {
  constructor(
    private readonly selfLogRepo: ISelfLogEntryRepository,
    private readonly eventPublisher: ISelfLogEventPublisher,
  ) {}

  async execute(dto: ExecutionRecordedPayload): Promise<DomainResult<void>> {
    // 1. Idempotency guard (ADR-0007): skip if already projected
    const existing = await this.selfLogRepo.findBySourceExecutionId(
      dto.executionId,
      dto.professionalProfileId,
    );
    if (existing !== null) return right(undefined);

    // 2. Parse temporal fields from the ACL payload (ADR-0010)
    const occurredAtUtcResult = UTCDateTime.fromISO(dto.occurredAtUtc);
    if (occurredAtUtcResult.isLeft()) {
      return left(
        new InvalidSelfLogEntryError('ExecutionRecordedPayload.occurredAtUtc is invalid', {
          raw: dto.occurredAtUtc,
        }),
      );
    }

    const logicalDayResult = LogicalDay.create(dto.logicalDay);
    if (logicalDayResult.isLeft()) {
      return left(
        new InvalidSelfLogEntryError('ExecutionRecordedPayload.logicalDay is invalid', {
          raw: dto.logicalDay,
        }),
      );
    }

    // 3. Build EntrySource with the executionId as sourceId (ADR-0047 — ID only)
    const sourceResult = EntrySource.execution(dto.executionId);
    if (sourceResult.isLeft()) return left(sourceResult.value);

    // 4. Create SelfLogEntry aggregate
    const entryResult = SelfLogEntry.create({
      clientId: dto.clientId,
      professionalProfileId: dto.professionalProfileId,
      source: sourceResult.value,
      deliverableId: dto.deliverableId,
      occurredAtUtc: occurredAtUtcResult.value,
      logicalDay: logicalDayResult.value,
      timezoneUsed: dto.timezoneUsed,
      createdAtUtc: UTCDateTime.now(),
    });
    /* c8 ignore next — defensive: create() only fails on value/unit/correctedEntryId invariants, none set by this handler */
    if (entryResult.isLeft()) return left(entryResult.value);

    const entry = entryResult.value;

    // 5. Persist (ADR-0003 — single aggregate per transaction)
    await this.selfLogRepo.save(entry);

    // 6. Construct and publish SelfLogRecordedEvent post-commit (ADR-0009 §4)
    const selfLogEvent = new SelfLogRecordedEvent(entry.id, entry.professionalProfileId, {
      selfLogEntryId: entry.id,
      clientId: entry.clientId,
      professionalProfileId: entry.professionalProfileId,
      logicalDay: entry.logicalDay.value,
      sourceType: entry.source.sourceType,
      sourceId: entry.source.sourceId,
      correctedEntryId: null,
    });
    await this.eventPublisher.publishSelfLogRecorded(selfLogEvent);

    return right(undefined);
  }
}
