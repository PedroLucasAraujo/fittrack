import type { LogicalDay } from '@fittrack/core';
import type { SelfLogEntry } from '../../domain/aggregates/self-log-entry.js';
import type { ISelfLogEntryRepository } from '../../domain/repositories/self-log-entry-repository.js';

/**
 * In-memory stub for ISelfLogEntryRepository.
 *
 * Stores SelfLogEntry instances in a plain array for test assertions.
 * Does not involve any external infrastructure.
 */
export class InMemorySelfLogEntryRepositoryStub implements ISelfLogEntryRepository {
  public items: SelfLogEntry[] = [];

  async save(entry: SelfLogEntry): Promise<void> {
    const idx = this.items.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      this.items[idx] = entry;
    } else {
      this.items.push(entry);
    }
  }

  async findById(id: string, professionalProfileId: string): Promise<SelfLogEntry | null> {
    return (
      this.items.find((e) => e.id === id && e.professionalProfileId === professionalProfileId) ??
      null
    );
  }

  async findByClientAndLogicalDay(
    clientId: string,
    logicalDay: LogicalDay,
    professionalProfileId: string,
  ): Promise<SelfLogEntry[]> {
    return this.items.filter(
      (e) =>
        e.clientId === clientId &&
        e.logicalDay.value === logicalDay.value &&
        e.professionalProfileId === professionalProfileId,
    );
  }

  async findByClientAndDateRange(
    clientId: string,
    from: LogicalDay,
    to: LogicalDay,
    professionalProfileId: string,
  ): Promise<SelfLogEntry[]> {
    return this.items.filter(
      (e) =>
        e.clientId === clientId &&
        e.professionalProfileId === professionalProfileId &&
        e.logicalDay.value >= from.value &&
        e.logicalDay.value <= to.value,
    );
  }

  async findBySourceExecutionId(
    executionId: string,
    professionalProfileId: string,
  ): Promise<SelfLogEntry | null> {
    return (
      this.items.find(
        (e) =>
          e.source.sourceId === executionId && e.professionalProfileId === professionalProfileId,
      ) ?? null
    );
  }
}
