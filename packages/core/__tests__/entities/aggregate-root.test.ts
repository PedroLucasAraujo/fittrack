import { describe, it, expect } from 'vitest';
import { AggregateRoot } from '../../entities/aggregate-root.js';
import type { DomainEvent } from '../../events/domain-event.js';

// Concrete aggregate root for testing
class TestAggregate extends AggregateRoot<{ value: number }> {
  static create(id: string, value: number, version?: number): TestAggregate {
    return new TestAggregate(id, { value }, version);
  }

  doSomething(event: DomainEvent): void {
    this.addDomainEvent(event);
  }
}

const VALID_UUID = '12345678-1234-4234-a234-123456789012';

const makeEvent = (overrides: Partial<DomainEvent> = {}): DomainEvent => ({
  eventId: 'eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee',
  eventType: 'SomethingHappened',
  eventVersion: 1,
  occurredAtUtc: new Date().toISOString(),
  aggregateId: VALID_UUID,
  aggregateType: 'TestAggregate',
  tenantId: 'tenant-1',
  payload: {},
  ...overrides,
});

describe('AggregateRoot', () => {
  describe('version', () => {
    it('defaults to 0 when not provided', () => {
      const agg = TestAggregate.create(VALID_UUID, 1);
      expect(agg.version).toBe(0);
    });

    it('uses the version passed to the constructor', () => {
      const agg = TestAggregate.create(VALID_UUID, 1, 5);
      expect(agg.version).toBe(5);
    });
  });

  describe('domain events', () => {
    it('getDomainEvents() returns empty array initially', () => {
      const agg = TestAggregate.create(VALID_UUID, 1);
      expect(agg.getDomainEvents()).toHaveLength(0);
    });

    it('addDomainEvent() registers an event', () => {
      const agg = TestAggregate.create(VALID_UUID, 1);
      const event = makeEvent();
      agg.doSomething(event);
      expect(agg.getDomainEvents()).toHaveLength(1);
      expect(agg.getDomainEvents()[0]).toBe(event);
    });

    it('multiple events are accumulated in order', () => {
      const agg = TestAggregate.create(VALID_UUID, 1);
      const e1 = makeEvent({ eventId: 'eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee' });
      const e2 = makeEvent({ eventId: 'ffffffff-ffff-4fff-afff-ffffffffffff' });
      agg.doSomething(e1);
      agg.doSomething(e2);
      expect(agg.getDomainEvents()).toHaveLength(2);
      expect(agg.getDomainEvents()[0]).toBe(e1);
      expect(agg.getDomainEvents()[1]).toBe(e2);
    });

    it('getDomainEvents() returns a readonly copy (not the internal array)', () => {
      const agg = TestAggregate.create(VALID_UUID, 1);
      agg.doSomething(makeEvent());
      const events = agg.getDomainEvents();
      // Mutating the returned array should not affect the internal state
      (events as DomainEvent[]).push(makeEvent());
      expect(agg.getDomainEvents()).toHaveLength(1);
    });

    it('clearDomainEvents() empties the collection', () => {
      const agg = TestAggregate.create(VALID_UUID, 1);
      agg.doSomething(makeEvent());
      agg.doSomething(makeEvent());
      agg.clearDomainEvents();
      expect(agg.getDomainEvents()).toHaveLength(0);
    });
  });
});
