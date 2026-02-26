import { BaseDomainEvent } from '@fittrack/core';

/**
 * Payload for the TemplateVersionChanged domain event (ADR-0009 §7).
 * Must not contain PII — reference IDs only (ADR-0037).
 */
export interface TemplateVersionChangedPayload {
  readonly catalogItemId: string;
  readonly professionalProfileId: string;
  /** Content version before the `updateContent` call. */
  readonly previousVersion: number;
  /** Content version after the `updateContent` call. */
  readonly newVersion: number;
}

/**
 * Emitted by `UpdateCatalogItemContent` after the CatalogItem content is
 * successfully persisted (ADR-0009 §4, §7).
 *
 * Downstream consumers (Deliverable context, Analytics) can use this event
 * to determine that a newer catalog version is available, or to track
 * prescription-time version drift.
 *
 * ## Producer context
 *
 * Catalog bounded context — emitted only for **custom** CatalogItems
 * (professionalProfileId ≠ null). Global items cannot be mutated by
 * professionals; therefore this event is never emitted for global items.
 *
 * eventVersion: 1
 */
export class TemplateVersionChangedEvent extends BaseDomainEvent {
  readonly eventType = 'TemplateVersionChanged' as const;
  readonly aggregateType = 'CatalogItem' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<TemplateVersionChangedPayload>,
  ) {
    super(1);
  }
}
