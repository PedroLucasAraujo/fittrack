import { BaseEntity } from './base-entity';
import type { DomainEvent } from '../events/domain-event';

/**
 * Base class for all aggregate roots per ADR-0047.
 *
 * An aggregate root is the single entry point for all state changes within
 * its consistency boundary. It:
 *   - Owns a set of subordinate entities and value objects.
 *   - Is loaded and persisted atomically within one transaction (ADR-0003).
 *   - Carries an optimistic locking `version` field (ADR-0006).
 *
 * ## Domain event dispatch (ADR-0009 §4)
 *
 * Aggregates are **pure state machines**. They do NOT collect or dispatch
 * domain events. The Application layer (UseCase) is the sole authority:
 *
 * 1. UseCase validates input and loads the aggregate from the repository.
 * 2. UseCase calls the aggregate domain method (state transition).
 * 3. Repository persists the aggregate within a transaction.
 * 4. Transaction commits.
 * 5. UseCase constructs domain event(s) for significant business facts.
 * 6. UseCase publishes event(s) to the event bus.
 *
 * `addDomainEvent()`, `getDomainEvents()`, and `clearDomainEvents()` are
 * reserved for a future event-sourcing adoption path (ADR-0009 §1.2).
 * They **MUST NOT** be called in current application-layer aggregates.
 * See ADR-0009 §10 (Prohibited Patterns).
 *
 * ## Optimistic locking (ADR-0006)
 *
 * The `version` field is initialized to `0` for newly created aggregates.
 * The repository increments it by 1 on every successful `save()`, and includes
 * the loaded version in the `WHERE` clause of the UPDATE statement.
 * A version mismatch raises `ConcurrencyConflictError`.
 *
 * Pass the persisted version when reconstituting the aggregate from storage:
 * ```typescript
 * new ConcreteAggregate(id, props, persistedVersion);
 * ```
 */
export abstract class AggregateRoot<Props> extends BaseEntity<Props> {
  private _domainEvents: DomainEvent[] = [];
  private _version: number;

  protected constructor(id: string, props: Props, version: number = 0) {
    super(id, props);
    this._version = version;
  }

  /**
   * Optimistic locking version (ADR-0006).
   * Initialized to `0` at aggregate creation.
   * Managed exclusively by the repository — never set by domain code.
   */
  get version(): number {
    return this._version;
  }

  /**
   * Registers a domain event in the internal collection.
   *
   * **Reserved for event-sourcing adoption (ADR-0009 §1.2).**
   * MUST NOT be called in current application-layer DDD aggregates.
   * The Application layer (UseCase) is the sole dispatcher of domain events.
   * See ADR-0009 §10 (Prohibited Patterns).
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Returns a snapshot of the domain events collected since the last
   * `clearDomainEvents()`. Returns a shallow copy so that external mutations
   * of the returned array cannot corrupt the internal collection.
   *
   * Reserved for event-sourcing adoption (ADR-0009 §1.2). In current
   * implementations this always returns an empty array since
   * `addDomainEvent()` must not be called.
   */
  getDomainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  /**
   * Clears the internal domain event collection.
   *
   * Reserved for event-sourcing adoption (ADR-0009 §1.2). Must be called
   * after all events returned by `getDomainEvents()` have been dispatched.
   */
  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
