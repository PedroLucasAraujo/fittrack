import type { TemplateVersionChangedEvent } from '../../domain/events/template-version-changed-event.js';

/**
 * Port for publishing domain events from the Catalog bounded context
 * (ADR-0009 §4).
 *
 * The Application layer (UseCase) is the sole dispatcher of domain events.
 * Events are published **post-save** — after the producing repository call
 * returns successfully (ADR-0009 §4, ADR-0047).
 *
 * Infrastructure implementations may publish to an in-process dispatcher,
 * an outbox table, or an external message bus (ADR-0009, ADR-0016).
 */
export interface ICatalogEventPublisher {
  /**
   * Publishes `TemplateVersionChanged` after `UpdateCatalogItemContent`
   * successfully persists the updated content (ADR-0009 §7).
   *
   * Downstream: Deliverable context (version drift tracking), analytics,
   * prescription-time version audit.
   */
  publishTemplateVersionChanged(event: TemplateVersionChangedEvent): Promise<void>;
}
