import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { CatalogItemNotFoundError } from '../../domain/errors/catalog-item-not-found-error.js';
import type { ICatalogItemRepository } from '../../domain/repositories/catalog-item-repository.js';
import type { DeprecateCatalogItemInputDTO } from '../dtos/deprecate-catalog-item-input-dto.js';
import type { DeprecateCatalogItemOutputDTO } from '../dtos/deprecate-catalog-item-output-dto.js';

/**
 * Transitions a CatalogItem from ACTIVE → DEPRECATED.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): scoped lookup via `findByIdAndProfessionalProfileId`
 *    returns null for global items and other tenants' items alike (404 semantics).
 * 2. State machine (ADR-0011 §7): only ACTIVE → DEPRECATED is permitted.
 *
 * ## Effect
 *
 * The item remains available for new prescriptions but is marked as not
 * recommended. Existing snapshots in Deliverables are unaffected (ADR-0011 §3).
 *
 * ## Global items
 *
 * Professionals cannot deprecate global (platform-curated) items.
 * `findByIdAndProfessionalProfileId` returns null for global items,
 * producing a CatalogItemNotFoundError (ADR-0025 — 404 semantics).
 */
export class DeprecateCatalogItem {
  constructor(private readonly catalogItemRepository: ICatalogItemRepository) {}

  async execute(
    dto: DeprecateCatalogItemInputDTO,
  ): Promise<DomainResult<DeprecateCatalogItemOutputDTO>> {
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

    // 4. State transition (validates ACTIVE → DEPRECATED)
    const deprecateResult = item.deprecate();
    if (deprecateResult.isLeft()) return left(deprecateResult.value);

    await this.catalogItemRepository.save(item);

    return right({
      catalogItemId: item.id,
      status: item.status,
      /* v8 ignore next */
      deprecatedAtUtc: item.deprecatedAtUtc?.toISO() ?? '',
    });
  }
}
