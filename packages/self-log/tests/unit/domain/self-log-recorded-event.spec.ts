import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { SelfLogRecordedEvent } from '../../../domain/events/self-log-recorded-event.js';
import { EntrySourceType } from '../../../domain/enums/entry-source-type.js';

describe('SelfLogRecordedEvent', () => {
  it('constructs with correct eventType and aggregateType', () => {
    const entryId = generateId();
    const professionalProfileId = generateId();
    const clientId = generateId();

    const event = new SelfLogRecordedEvent(entryId, professionalProfileId, {
      selfLogEntryId: entryId,
      clientId,
      professionalProfileId,
      logicalDay: '2026-02-22',
      sourceType: EntrySourceType.SELF,
      sourceId: null,
      correctedEntryId: null,
    });

    expect(event.eventType).toBe('SelfLogRecorded');
    expect(event.aggregateType).toBe('SelfLogEntry');
    expect(event.eventVersion).toBe(1);
    expect(event.aggregateId).toBe(entryId);
    expect(event.tenantId).toBe(professionalProfileId);
  });

  it('auto-generates eventId (UUIDv4) and occurredAtUtc at construction (ADR-0009)', () => {
    const event = new SelfLogRecordedEvent(generateId(), generateId(), {
      selfLogEntryId: generateId(),
      clientId: generateId(),
      professionalProfileId: generateId(),
      logicalDay: '2026-02-22',
      sourceType: EntrySourceType.EXECUTION,
      sourceId: generateId(),
      correctedEntryId: null,
    });

    expect(event.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(event.occurredAtUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('payload does not contain health data (ADR-0037)', () => {
    const event = new SelfLogRecordedEvent(generateId(), generateId(), {
      selfLogEntryId: generateId(),
      clientId: generateId(),
      professionalProfileId: generateId(),
      logicalDay: '2026-02-22',
      sourceType: EntrySourceType.SELF,
      sourceId: null,
      correctedEntryId: null,
    });

    expect(event.payload).not.toHaveProperty('value');
    expect(event.payload).not.toHaveProperty('unit');
    expect(event.payload).not.toHaveProperty('note');
  });

  it('carries correctedEntryId in the payload when provided', () => {
    const correctedEntryId = generateId();
    const event = new SelfLogRecordedEvent(generateId(), generateId(), {
      selfLogEntryId: generateId(),
      clientId: generateId(),
      professionalProfileId: generateId(),
      logicalDay: '2026-02-22',
      sourceType: EntrySourceType.SELF,
      sourceId: null,
      correctedEntryId,
    });

    expect(event.payload.correctedEntryId).toBe(correctedEntryId);
  });
});
