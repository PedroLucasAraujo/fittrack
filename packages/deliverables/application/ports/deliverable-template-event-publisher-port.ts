import type { DeliverableTemplateCreatedEvent } from '../../domain/events/deliverable-template-created-event.js';
import type { DeliverableTemplateActivatedEvent } from '../../domain/events/deliverable-template-activated-event.js';
import type { DeliverableTemplateArchivedEvent } from '../../domain/events/deliverable-template-archived-event.js';
import type { DeliverableTemplateVersionedEvent } from '../../domain/events/deliverable-template-versioned-event.js';
import type { DeliverableTemplateInstantiatedEvent } from '../../domain/events/deliverable-template-instantiated-event.js';

/**
 * Port for publishing domain events from the Deliverables bounded context
 * (ADR-0009 §4).
 *
 * The Application layer (UseCase) is the sole dispatcher of domain events.
 * Events are published **post-commit** — after the producing transaction
 * commits successfully (ADR-0009 §1, ADR-0003).
 *
 * Infrastructure implementations may publish to an in-process dispatcher,
 * an outbox table, or an external message bus (ADR-0009, ADR-0016).
 */
export interface IDeliverableTemplateEventPublisher {
  /**
   * Publishes `DeliverableTemplateCreated` after `CreateDeliverableTemplate`
   * successfully persists a new DRAFT template (ADR-0009 §7).
   */
  publishDeliverableTemplateCreated(event: DeliverableTemplateCreatedEvent): Promise<void>;

  /**
   * Publishes `DeliverableTemplateActivated` after `ActivateDeliverableTemplate`
   * transitions the template to ACTIVE (ADR-0009 §7).
   *
   * Downstream: Enables instantiation, analytics.
   */
  publishDeliverableTemplateActivated(event: DeliverableTemplateActivatedEvent): Promise<void>;

  /**
   * Publishes `DeliverableTemplateArchived` after `ArchiveDeliverableTemplate`
   * transitions the template to ARCHIVED (ADR-0009 §7).
   */
  publishDeliverableTemplateArchived(event: DeliverableTemplateArchivedEvent): Promise<void>;

  /**
   * Publishes `DeliverableTemplateVersioned` after `CreateTemplateVersion`
   * creates a new DRAFT version from an ACTIVE template (ADR-0009 §7).
   */
  publishDeliverableTemplateVersioned(event: DeliverableTemplateVersionedEvent): Promise<void>;

  /**
   * Publishes `DeliverableTemplateInstantiated` after `InstantiateDeliverableTemplate`
   * persists a new Deliverable from the template snapshot (ADR-0009 §7).
   *
   * Downstream: The event handler is responsible for incrementing the template's
   * `usageCount` in a separate transaction (ADR-0003 — one aggregate per transaction).
   */
  publishDeliverableTemplateInstantiated(
    event: DeliverableTemplateInstantiatedEvent,
  ): Promise<void>;
}
