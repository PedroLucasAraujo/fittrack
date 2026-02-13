import { BaseEntity } from './base-entity';
import type { DomainEvent } from '../events/domain-event';

/**
 * Base class for all aggregate roots per ADR-0047.
 *
 * An aggregate root is the single entry point for all state changes within
 * its consistency boundary. It:
 *   - Owns a set of subordinate entities and value objects.
 *   - Is loaded and persisted atomically within one transaction (ADR-0003).
 *   - Publishes domain events on behalf of its aggregate (ADR-0009).
 *   - Carries an optimistic locking `version` field (ADR-0006).
 *
 * ## Domain event lifecycle (ADR-0009 §3)
 *
 * 1. A domain method executes and calls `this.addDomainEvent(event)`.
 * 2. The repository persists the aggregate within the transaction.
 * 3. The transaction commits.
 * 4. The application layer calls `aggregate.getDomainEvents()`.
 * 5. The application layer publishes the events to the event bus.
 * 6. The application layer calls `aggregate.clearDomainEvents()`.
 *
 * Events must never be published before step 3 (commit). See ADR-0009 §7.
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
   * Registers a domain event to be dispatched after the transaction commits.
   *
   * Call this inside domain methods whenever a valid state transition occurs.
   * Do not publish events directly from here — the application layer reads and
   * dispatches all collected events via `getDomainEvents()` (ADR-0009 §3).
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Returns a snapshot of the domain events collected since the last
   * `clearDomainEvents()`. Returns a shallow copy so that external mutations
   * of the returned array cannot corrupt the internal collection.
   *
   * Called by the application layer after the repository commits the
   * aggregate, immediately before dispatching to the event bus.
   */
  getDomainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  /**
   * Clears the internal domain event collection.
   *
   * Must be called by the application layer after all events returned by
   * `getDomainEvents()` have been successfully dispatched (ADR-0009 §3 step 8).
   */
  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
