import { UTCDateTime, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { ISelfLogEntryRepository } from '../../domain/repositories/self-log-entry-repository.js';
import type { ISelfLogEventPublisher } from '../ports/self-log-event-publisher-port.js';
import { SelfLogEntryNotFoundError } from '../../domain/errors/self-log-entry-not-found-error.js';
import { SelfLogAnonymizedEvent } from '../../domain/events/self-log-anonymized-event.js';
import { InvalidSelfLogEntryError } from '../../domain/errors/invalid-self-log-entry-error.js';

export interface AnonymizeSelfLogEntryInputDTO {
  readonly selfLogEntryId: string;
  readonly professionalProfileId: string;
  readonly deletedAtUtc: string;
}

/**
 * Anonymizes a SelfLogEntry by nulling all health data fields (LGPD erasure — ADR-0037).
 *
 * ## Flow
 *
 * 1. Parse `deletedAtUtc` from the DTO.
 * 2. Load the SelfLogEntry by ID, scoped to the given tenant (ADR-0025).
 * 3. Call `entry.anonymize(deletedAt)` — returns Left if already anonymized.
 * 4. Persist the updated entry (ADR-0003 — single aggregate per transaction).
 * 5. Publish `SelfLogAnonymizedEvent` post-save (ADR-0009 §4 — use case dispatches).
 *
 * ## Tenant isolation (ADR-0025)
 *
 * `findById(id, professionalProfileId)` returns null on cross-tenant access.
 * The use case returns `SelfLogEntryNotFoundError` in that case (404 semantics).
 *
 * ## LGPD (ADR-0037)
 *
 * The emitted `SelfLogAnonymizedEvent` carries no health data — only IDs.
 */
export class AnonymizeSelfLogEntry {
  constructor(
    private readonly repo: ISelfLogEntryRepository,
    private readonly eventPublisher: ISelfLogEventPublisher,
  ) {}

  async execute(dto: AnonymizeSelfLogEntryInputDTO): Promise<DomainResult<void>> {
    // 1. Parse deletedAtUtc
    const deletedAtResult = UTCDateTime.fromISO(dto.deletedAtUtc);
    if (deletedAtResult.isLeft()) {
      return left(
        new InvalidSelfLogEntryError('deletedAtUtc is not a valid ISO 8601 UTC timestamp', {
          raw: dto.deletedAtUtc,
        }),
      );
    }

    // 2. Load entry, scoped to tenant (ADR-0025)
    const entry = await this.repo.findById(dto.selfLogEntryId, dto.professionalProfileId);
    if (!entry) return left(new SelfLogEntryNotFoundError(dto.selfLogEntryId));

    // 3. Anonymize — aggregate guards against double-anonymization
    const anonymizeResult = entry.anonymize(deletedAtResult.value);
    if (anonymizeResult.isLeft()) return left(anonymizeResult.value);

    // 4. Persist (ADR-0003 — single aggregate per transaction)
    await this.repo.save(entry);

    // 5. Publish post-save (ADR-0009 §4 — use case is the sole event dispatcher)
    const event = new SelfLogAnonymizedEvent(entry.id, entry.professionalProfileId, {
      selfLogEntryId: entry.id,
      clientId: entry.clientId,
      professionalProfileId: entry.professionalProfileId,
    });
    await this.eventPublisher.publishSelfLogAnonymized(event);

    return right(undefined);
  }
}
