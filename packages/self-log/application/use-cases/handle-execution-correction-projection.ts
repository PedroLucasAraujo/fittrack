import { UTCDateTime, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { ExecutionCorrectionRecordedPayload } from '../ports/execution-correction-recorded-payload.js';
import { SelfLogEntry } from '../../domain/aggregates/self-log-entry.js';
import { EntrySource } from '../../domain/value-objects/entry-source.js';
import { SelfLogCorrectionProjectedEvent } from '../../domain/events/self-log-correction-projected-event.js';
import type { ISelfLogEntryRepository } from '../../domain/repositories/self-log-entry-repository.js';
import type { ISelfLogEventPublisher } from '../ports/self-log-event-publisher-port.js';

/**
 * Projects an ExecutionCorrectionRecorded event into the SelfLog context.
 *
 * Triggered by the `ExecutionCorrectionRecorded` domain event via an event-driven
 * handler (ADR-0016 eventual consistency — ≤5min target for read model projections).
 *
 * ## Append-only correction model (ADR-0005 §4)
 *
 * Does NOT modify the original SelfLogEntry. Creates a NEW SelfLogEntry with:
 * - `source = EntrySource.execution(correctionId)` — tracks the correction entity
 * - `correctedEntryId = originalEntry.id` — links back to the superseded entry
 *
 * The correctionId is used as the new entry's sourceId (rather than reusing
 * the originalExecutionId) so that idempotency checks and downstream consumers
 * can distinguish the correction projection from the original execution projection.
 *
 * ## Idempotency (ADR-0007)
 *
 * Before creating a new correction SelfLogEntry, checks whether a projection
 * already exists for the given correctionId. If so, returns `right(undefined)`
 * without side effects. This guards against duplicate projections on at-least-once
 * event delivery (ADR-0016 §3).
 *
 * ## Original projection not found
 *
 * If no SelfLogEntry exists for `originalExecutionId` (e.g., the execution was
 * never projected or the projection is still in-flight), this handler returns
 * `right(undefined)` silently. Persistent failures are handled via the DLQ
 * (ADR-0016 §4) at the infrastructure level.
 *
 * ## Consistency boundary (ADR-0003)
 *
 * This handler executes in its own transaction scope — separate from the
 * Execution correction transaction. SelfLog and Execution are independent
 * aggregates (ADR-0047).
 *
 * ## Non-authoritative (ADR-0005, ADR-0014)
 *
 * The projected SelfLogEntry reflects Execution correction data but never
 * supersedes or alters the Execution record. Execution remains the source of
 * truth.
 *
 * ## LGPD (ADR-0037)
 *
 * No health data is stored on source=EXECUTION entries in this projection.
 * Only IDs and temporal fields are projected.
 */
export class HandleExecutionCorrectionProjection {
  constructor(
    private readonly selfLogRepo: ISelfLogEntryRepository,
    private readonly eventPublisher: ISelfLogEventPublisher,
  ) {}

  async execute(dto: ExecutionCorrectionRecordedPayload): Promise<DomainResult<void>> {
    // 1. Idempotency guard (ADR-0007): skip if correction projection already exists
    const existingCorrection = await this.selfLogRepo.findBySourceExecutionId(
      dto.correctionId,
      dto.professionalProfileId,
    );
    if (existingCorrection !== null) return right(undefined);

    // 2. Find the original projection by originalExecutionId
    const originalEntry = await this.selfLogRepo.findBySourceExecutionId(
      dto.originalExecutionId,
      dto.professionalProfileId,
    );
    // If original projection doesn't exist (not yet projected or never created), skip silently
    if (originalEntry === null) return right(undefined);

    // 3. Build EntrySource using correctionId as sourceId (distinguishes from original entry)
    const sourceResult = EntrySource.execution(dto.correctionId);
    if (sourceResult.isLeft()) return left(sourceResult.value);

    // 4. Create new correction SelfLogEntry (append-only model, ADR-0005 §4)
    // Temporal fields are copied from the original — the correction doesn't change
    // when the activity occurred, only that a correction was made.
    const entryResult = SelfLogEntry.create({
      clientId: originalEntry.clientId,
      professionalProfileId: originalEntry.professionalProfileId,
      source: sourceResult.value,
      deliverableId: originalEntry.deliverableId,
      occurredAtUtc: originalEntry.occurredAtUtc,
      logicalDay: originalEntry.logicalDay,
      timezoneUsed: originalEntry.timezoneUsed,
      createdAtUtc: UTCDateTime.now(),
      correctedEntryId: originalEntry.id,
    });
    /* c8 ignore next — defensive: create() only fails if correctedEntryId is invalid UUID, but originalEntry.id is always a valid UUIDv4 */
    if (entryResult.isLeft()) return left(entryResult.value);

    const entry = entryResult.value;

    // 5. Persist (ADR-0003 — single aggregate per transaction)
    await this.selfLogRepo.save(entry);

    // 6. Construct and publish SelfLogCorrectionProjectedEvent post-commit (ADR-0009 §4)
    const event = new SelfLogCorrectionProjectedEvent(entry.id, entry.professionalProfileId, {
      selfLogEntryId: entry.id,
      originalEntryId: originalEntry.id,
      clientId: entry.clientId,
      professionalProfileId: entry.professionalProfileId,
      logicalDay: entry.logicalDay.value,
      correctionId: dto.correctionId,
    });
    await this.eventPublisher.publishSelfLogCorrectionProjected(event);

    return right(undefined);
  }
}
