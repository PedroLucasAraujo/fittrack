import { UTCDateTime, LogicalDay, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { SelfLogEntry } from '../../domain/aggregates/self-log-entry.js';
import { EntrySource } from '../../domain/value-objects/entry-source.js';
import { SelfLogNote } from '../../domain/value-objects/self-log-note.js';
import { SelfLogRecordedEvent } from '../../domain/events/self-log-recorded-event.js';
import { InvalidSelfLogEntryError } from '../../domain/errors/invalid-self-log-entry-error.js';
import type { ISelfLogEntryRepository } from '../../domain/repositories/self-log-entry-repository.js';
import type { ISelfLogEventPublisher } from '../ports/self-log-event-publisher-port.js';

export interface RecordSelfLogEntryInputDTO {
  /** UUIDv4 of the client logging the entry. */
  clientId: string;
  /** UUIDv4 of the professional whose PersonalMode context this belongs to (ADR-0025). */
  professionalProfileId: string;
  /** Optional free-text note (1–500 chars). */
  note?: string;
  /** Optional numeric measurement (finite, ≥ 0). */
  value?: number;
  /** Optional unit label (1–30 chars). */
  unit?: string;
  /** ISO 8601 UTC string (ends with 'Z') for when the activity occurred. */
  occurredAtUtc: string;
  /** IANA timezone identifier used to compute logicalDay (ADR-0010). */
  timezoneUsed: string;
  /**
   * If this entry corrects a prior SelfLogEntry, the ID of the superseded entry.
   * Must be a valid UUIDv4. Null / absent for original entries.
   */
  correctedEntryId?: string;
}

export interface RecordSelfLogEntryOutputDTO {
  selfLogEntryId: string;
}

/**
 * Records a manually logged SelfLog entry (source=SELF).
 *
 * ## Workflow (ADR-0009 §4, ADR-0003)
 *
 * 1. Parse and validate temporal inputs.
 * 2. Derive `logicalDay` from `occurredAtUtc` + `timezoneUsed` (ADR-0010).
 * 3. Build value objects (note, source).
 * 4. Call `SelfLogEntry.create()` — pure domain factory.
 * 5. Persist the aggregate.
 * 6. Construct and publish `SelfLogRecordedEvent` post-commit (ADR-0009 §4).
 *
 * ## Invariants
 *
 * - Does not validate professional prescriptions (SelfLog must NOT govern Deliverables).
 * - Does not touch AccessGrant or Billing contexts.
 * - Execution is not involved — this is personal tracking.
 * - Respects LGPD: no health data in event payload (ADR-0037).
 */
export class RecordSelfLogEntry {
  constructor(
    private readonly selfLogRepo: ISelfLogEntryRepository,
    private readonly eventPublisher: ISelfLogEventPublisher,
  ) {}

  async execute(
    dto: RecordSelfLogEntryInputDTO,
  ): Promise<DomainResult<RecordSelfLogEntryOutputDTO>> {
    // 1. Parse occurredAtUtc
    const occurredAtUtcResult = UTCDateTime.fromISO(dto.occurredAtUtc);
    if (occurredAtUtcResult.isLeft()) {
      return left(
        new InvalidSelfLogEntryError('invalid occurredAtUtc', { raw: dto.occurredAtUtc }),
      );
    }

    // 2. Derive logicalDay from timezone (ADR-0010)
    const logicalDayResult = LogicalDay.fromDate(occurredAtUtcResult.value.value, dto.timezoneUsed);
    if (logicalDayResult.isLeft()) {
      return left(new InvalidSelfLogEntryError('invalid timezoneUsed', { raw: dto.timezoneUsed }));
    }

    // 3a. Build note value object if provided
    let note: InstanceType<typeof SelfLogNote> | null = null;
    if (dto.note !== undefined) {
      const noteResult = SelfLogNote.create(dto.note);
      if (noteResult.isLeft()) return left(noteResult.value);
      note = noteResult.value;
    }

    // 3b. Build source value object (source=SELF has no sourceId)
    const source = EntrySource.self();

    // 4. Create SelfLogEntry aggregate
    const entryResult = SelfLogEntry.create({
      clientId: dto.clientId,
      professionalProfileId: dto.professionalProfileId,
      source,
      note,
      value: dto.value ?? null,
      unit: dto.unit ?? null,
      occurredAtUtc: occurredAtUtcResult.value,
      logicalDay: logicalDayResult.value,
      timezoneUsed: dto.timezoneUsed,
      createdAtUtc: UTCDateTime.now(),
      correctedEntryId: dto.correctedEntryId ?? null,
    });
    if (entryResult.isLeft()) return left(entryResult.value);

    const entry = entryResult.value;

    // 5. Persist (ADR-0003 — single aggregate per transaction)
    await this.selfLogRepo.save(entry);

    // 6. Construct and publish SelfLogRecordedEvent post-commit (ADR-0009 §4)
    const event = new SelfLogRecordedEvent(entry.id, entry.professionalProfileId, {
      selfLogEntryId: entry.id,
      clientId: entry.clientId,
      professionalProfileId: entry.professionalProfileId,
      logicalDay: entry.logicalDay.value,
      sourceType: entry.source.sourceType,
      sourceId: entry.source.sourceId,
      correctedEntryId: entry.correctedEntryId,
    });
    await this.eventPublisher.publishSelfLogRecorded(event);

    return right({ selfLogEntryId: entry.id });
  }
}
