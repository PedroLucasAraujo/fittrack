import { left, right, UniqueEntityId, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { CatalogItem } from '../../domain/aggregates/catalog-item.js';
import { CatalogItemName } from '../../domain/value-objects/catalog-item-name.js';
import type { ICatalogItemRepository } from '../../domain/repositories/catalog-item-repository.js';
import type { CreateCatalogItemInputDTO } from '../dtos/create-catalog-item-input-dto.js';
import type { CreateCatalogItemOutputDTO } from '../dtos/create-catalog-item-output-dto.js';

/**
 * Creates a new CatalogItem in ACTIVE status.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): `professionalProfileId` from JWT when
 *    creating a custom item. `null` is accepted for platform-global items
 *    (platform admin operation — HTTP layer must restrict this).
 * 2. Name validation: 1–120 chars (CatalogItemName value object).
 * 3. Temporal (ADR-0010): `createdAtUtc` must be a valid UTC ISO 8601 string.
 * 4. CatalogItems are created ACTIVE — no DRAFT state (ADR-0011 §7).
 *
 * ## Ownership
 *
 * `professionalProfileId = null` → global item visible to all professionals.
 * `professionalProfileId = UUID` → custom item visible only to the owner.
 *
 * ## No domain events
 *
 * CatalogItem does not emit domain events in MVP (ADR-0009 §5 — no registered
 * cross-context consumers for Catalog events, ADR-0001 §5).
 */
export class CreateCatalogItem {
  constructor(private readonly catalogItemRepository: ICatalogItemRepository) {}

  async execute(dto: CreateCatalogItemInputDTO): Promise<DomainResult<CreateCatalogItemOutputDTO>> {
    // 1. Validate professionalProfileId when provided (ADR-0025)
    if (dto.professionalProfileId !== null && dto.professionalProfileId !== undefined) {
      const profileIdResult = UniqueEntityId.create(dto.professionalProfileId);
      if (profileIdResult.isLeft()) return left(profileIdResult.value);
    }

    // 2. Validate name
    const nameResult = CatalogItemName.create(dto.name);
    if (nameResult.isLeft()) return left(nameResult.value);

    // 3. Parse createdAtUtc (ADR-0010)
    const createdAtUtcResult = UTCDateTime.fromISO(dto.createdAtUtc);
    if (createdAtUtcResult.isLeft()) return left(createdAtUtcResult.value);

    // 4. Create CatalogItem in ACTIVE
    const itemResult = CatalogItem.create({
      professionalProfileId: dto.professionalProfileId ?? null,
      type: dto.type,
      name: nameResult.value,
      description: dto.description ?? null,
      category: dto.category ?? null,
      muscleGroups: dto.muscleGroups ?? [],
      instructions: dto.instructions ?? null,
      mediaUrl: dto.mediaUrl ?? null,
      createdAtUtc: createdAtUtcResult.value,
    });

    /* v8 ignore next */
    if (itemResult.isLeft()) return left(itemResult.value);

    const item = itemResult.value;

    await this.catalogItemRepository.save(item);

    return right({
      catalogItemId: item.id,
      professionalProfileId: item.professionalProfileId,
      type: item.type,
      status: item.status,
      name: item.name.value,
      contentVersion: item.contentVersion,
      description: item.description,
      category: item.category,
      muscleGroups: item.muscleGroups,
      instructions: item.instructions,
      mediaUrl: item.mediaUrl,
      createdAtUtc: item.createdAtUtc.toISO(),
    });
  }
}
