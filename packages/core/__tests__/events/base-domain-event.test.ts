import { describe, it, expect } from 'vitest';
import { BaseDomainEvent } from '../../events/base-domain-event.js';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Concrete implementation for testing
class TestEvent extends BaseDomainEvent {
  readonly eventType = 'TestHappened';
  readonly aggregateId: string;
  readonly aggregateType = 'TestAggregate';
  readonly tenantId: string;
  readonly payload: Readonly<Record<string, unknown>>;

  constructor(
    aggregateId: string,
    tenantId: string,
    payload: Record<string, unknown> = {},
    version?: number,
  ) {
    super(version);
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.payload = payload;
  }
}

const AGG_ID = '12345678-1234-4234-a234-123456789012';
const TENANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('BaseDomainEvent', () => {
  it('auto-generates a valid UUIDv4 eventId', () => {
    const event = new TestEvent(AGG_ID, TENANT);
    expect(UUID_V4_REGEX.test(event.eventId)).toBe(true);
  });

  it('eventId is unique per instance', () => {
    const a = new TestEvent(AGG_ID, TENANT);
    const b = new TestEvent(AGG_ID, TENANT);
    expect(a.eventId).not.toBe(b.eventId);
  });

  it('occurredAtUtc is an ISO 8601 UTC string ending with Z', () => {
    const event = new TestEvent(AGG_ID, TENANT);
    expect(event.occurredAtUtc.endsWith('Z')).toBe(true);
    expect(() => new Date(event.occurredAtUtc)).not.toThrow();
  });

  it('eventVersion defaults to 1 when not specified', () => {
    const event = new TestEvent(AGG_ID, TENANT);
    expect(event.eventVersion).toBe(1);
  });

  it('eventVersion uses the value passed to the constructor', () => {
    const event = new TestEvent(AGG_ID, TENANT, {}, 3);
    expect(event.eventVersion).toBe(3);
  });

  it('concrete fields are set by the subclass', () => {
    const event = new TestEvent(AGG_ID, TENANT, { foo: 'bar' });
    expect(event.eventType).toBe('TestHappened');
    expect(event.aggregateId).toBe(AGG_ID);
    expect(event.aggregateType).toBe('TestAggregate');
    expect(event.tenantId).toBe(TENANT);
    expect(event.payload).toEqual({ foo: 'bar' });
  });
});
