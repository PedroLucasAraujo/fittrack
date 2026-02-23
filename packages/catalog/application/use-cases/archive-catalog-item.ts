import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { CatalogItemNotFoundError } from '../../domain/errors/catalog-item-not-found-error.js';
import type { ICatalogItemRepository } from '../../domain/repositories/catalog-item-repository.js';
import type { ArchiveCatalogItemInputDTO } from '../dtos/archive-catalog-item-input-dto.js';
import type { ArchiveCatalogItemOutputDTO } from '../dtos/archive-catalog-item-output-dto.js';

/**
 * Transitions a CatalogItem from ACTIVE or DEPRECATED → ARCHIVED.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): scoped lookup via `findByIdAndProfessionalProfileId`
 *    returns null for global items and other tenants' items alike (404 semantics).
 * 2. State machine (ADR-0011 §7): ACTIVE|DEPRECATED → ARCHIVED only. Attempting
 *    to archive an already-ARCHIVED item returns `InvalidCatalogItemTransitionError`.
 *
 * ## Effect
 *
 * ARCHIVED is a terminal state. The item can no longer be used in new
 * prescriptions. Existing snapshots in Deliverables are permanently unaffected
 * (ADR-0011 §3). The item record is never hard-deleted (ADR-0013 Tier 3).
 *
 * ## Global items
 *
 * Professionals cannot archive global (platform-curated) items.
 * `findByIdAndProfessionalProfileId` returns null for global items,
 * producing a CatalogItemNotFoundError (ADR-0025 — 404 semantics).
 */
export class ArchiveCatalogItem {
  constructor(private readonly catalogItemRepository: ICatalogItemRepository) {}

  async execute(
    dto: ArchiveCatalogItemInputDTO,
  ): Promise<DomainResult<ArchiveCatalogItemOutputDTO>> {
    // 1. Validate professionalProfileId (ADR-0025)
    const profileIdResult = UniqueEntityId.create(dto.professionalProfileId);
    if (profileIdResult.isLeft()) return left(profileIdResult.value);

    // 2. Validate catalogItemId
    const itemIdResult = UniqueEntityId.create(dto.catalogItemId);
    if (itemIdResult.isLeft()) return left(itemIdResult.value);

    // 3. Scoped lookup — returns null for wrong tenant and for global items (ADR-0025)
    const item = await this.catalogItemRepository.findByIdAndProfessionalProfileId(
      dto.catalogItemId,
      dto.professionalProfileId,
    );

    if (!item) {
      return left(new CatalogItemNotFoundError(dto.catalogItemId));
    }

    // 4. State transition (validates ACTIVE|DEPRECATED → ARCHIVED)
    const archiveResult = item.archive();
    if (archiveResult.isLeft()) return left(archiveResult.value);

    await this.catalogItemRepository.save(item);

    return right({
      catalogItemId: item.id,
      status: item.status,
      /* v8 ignore next */
      archivedAtUtc: item.archivedAtUtc?.toISO() ?? '',
    });
  }
}
