import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { SelfLogEntry } from '../../domain/aggregates/self-log-entry.js';
import { EntrySource } from '../../domain/value-objects/entry-source.js';
import type { SelfLogEntryProps } from '../../domain/aggregates/self-log-entry.js';

type SelfLogEntryOverrides = Partial<{
  id: string;
  clientId: string;
  professionalProfileId: string;
  source: EntrySource;
  deliverableId: string | null;
  note: null;
  value: number | null;
  unit: string | null;
  occurredAtUtc: UTCDateTime;
  logicalDay: LogicalDay;
  timezoneUsed: string;
  createdAtUtc: UTCDateTime;
  correctedEntryId: string | null;
  deletedAtUtc: UTCDateTime | null;
  version: number;
}>;

/**
 * Test factory for SelfLogEntry — uses `reconstitute` to bypass use-case validation.
 *
 * Defaults to a minimal valid SELF-sourced SelfLogEntry in America/Sao_Paulo.
 */
export function makeSelfLogEntry(overrides: SelfLogEntryOverrides = {}): SelfLogEntry {
  const logicalDay =
    overrides.logicalDay ??
    (() => {
      const result = LogicalDay.create('2026-02-22');
      if (result.isLeft()) throw new Error('makeSelfLogEntry: invalid default logicalDay');
      return result.value;
    })();

  const props: SelfLogEntryProps = {
    clientId: overrides.clientId ?? generateId(),
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    source: overrides.source ?? EntrySource.self(),
    deliverableId: overrides.deliverableId ?? null,
    note: overrides.note ?? null,
    value: overrides.value ?? null,
    unit: overrides.unit ?? null,
    occurredAtUtc: overrides.occurredAtUtc ?? UTCDateTime.now(),
    logicalDay,
    timezoneUsed: overrides.timezoneUsed ?? 'America/Sao_Paulo',
    createdAtUtc: overrides.createdAtUtc ?? UTCDateTime.now(),
    correctedEntryId: overrides.correctedEntryId ?? null,
    deletedAtUtc: overrides.deletedAtUtc ?? null,
  };

  return SelfLogEntry.reconstitute(overrides.id ?? generateId(), props, overrides.version ?? 0);
}
