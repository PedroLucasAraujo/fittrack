import type { ICatalogEventPublisher } from '../../application/ports/catalog-event-publisher-port.js';
import type { TemplateVersionChangedEvent } from '../../domain/events/template-version-changed-event.js';

/**
 * In-memory stub for ICatalogEventPublisher.
 *
 * Captures all published events in-memory for test assertions.
 * Does not involve any external infrastructure.
 */
export class InMemoryCatalogEventPublisherStub implements ICatalogEventPublisher {
  /** All TemplateVersionChanged events published during the test. */
  public publishedTemplateVersionChanged: TemplateVersionChangedEvent[] = [];

  async publishTemplateVersionChanged(event: TemplateVersionChangedEvent): Promise<void> {
    this.publishedTemplateVersionChanged.push(event);
  }
}
