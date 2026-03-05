import type { IDeliverableTemplateEventPublisher } from '../../application/ports/deliverable-template-event-publisher-port.js';
import type { DeliverableTemplateCreatedEvent } from '../../domain/events/deliverable-template-created-event.js';
import type { DeliverableTemplateActivatedEvent } from '../../domain/events/deliverable-template-activated-event.js';
import type { DeliverableTemplateArchivedEvent } from '../../domain/events/deliverable-template-archived-event.js';
import type { DeliverableTemplateVersionedEvent } from '../../domain/events/deliverable-template-versioned-event.js';
import type { DeliverableTemplateInstantiatedEvent } from '../../domain/events/deliverable-template-instantiated-event.js';

/**
 * In-memory stub for IDeliverableTemplateEventPublisher.
 *
 * Captures all published events so tests can assert on what was dispatched
 * without requiring a real event bus.
 */
export class StubDeliverableTemplateEventPublisher implements IDeliverableTemplateEventPublisher {
  readonly publishedCreatedEvents: DeliverableTemplateCreatedEvent[] = [];
  readonly publishedActivatedEvents: DeliverableTemplateActivatedEvent[] = [];
  readonly publishedArchivedEvents: DeliverableTemplateArchivedEvent[] = [];
  readonly publishedVersionedEvents: DeliverableTemplateVersionedEvent[] = [];
  readonly publishedInstantiatedEvents: DeliverableTemplateInstantiatedEvent[] = [];

  async publishDeliverableTemplateCreated(event: DeliverableTemplateCreatedEvent): Promise<void> {
    this.publishedCreatedEvents.push(event);
  }

  async publishDeliverableTemplateActivated(
    event: DeliverableTemplateActivatedEvent,
  ): Promise<void> {
    this.publishedActivatedEvents.push(event);
  }

  async publishDeliverableTemplateArchived(event: DeliverableTemplateArchivedEvent): Promise<void> {
    this.publishedArchivedEvents.push(event);
  }

  async publishDeliverableTemplateVersioned(
    event: DeliverableTemplateVersionedEvent,
  ): Promise<void> {
    this.publishedVersionedEvents.push(event);
  }

  async publishDeliverableTemplateInstantiated(
    event: DeliverableTemplateInstantiatedEvent,
  ): Promise<void> {
    this.publishedInstantiatedEvents.push(event);
  }
}
