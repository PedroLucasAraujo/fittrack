import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { CatalogItemName } from '../../domain/value-objects/catalog-item-name.js';
import { CatalogItemNotFoundError } from '../../domain/errors/catalog-item-not-found-error.js';
import { TemplateVersionChangedEvent } from '../../domain/events/template-version-changed-event.js';
import type { ICatalogItemRepository } from '../../domain/repositories/catalog-item-repository.js';
import type { ICatalogEventPublisher } from '../ports/catalog-event-publisher-port.js';
import type { UpdateCatalogItemContentInputDTO } from '../dtos/update-catalog-item-content-input-dto.js';
import type { UpdateCatalogItemContentOutputDTO } from '../dtos/update-catalog-item-content-output-dto.js';

/**
 * Updates the content fields of a custom CatalogItem.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): scoped lookup via `findByIdAndProfessionalProfileId`
 *    returns null for global items and other tenants' items alike (404 semantics).
 * 2. Name validation: 1–120 chars if a new name is provided.
 * 3. Archived items are rejected with `CatalogItemArchivedError` (ADR-0011 §3).
 * 4. `contentVersion` is incremented on every successful update (ADR-0011 §4).
 *
 * ## Effect
 *
 * Only future prescriptions will see the updated content.
 * Existing snapshots in Deliverables are permanently unaffected (ADR-0011 §3).
 *
 * ## Domain event (ADR-0009 §7)
 *
 * `TemplateVersionChanged` is published post-save on every successful content
 * update. The event carries `previousVersion` and `newVersion` to allow
 * downstream consumers (Deliverable context, analytics) to detect version drift
 * in active prescriptions.
 *
 * ## Global items
 *
 * Professionals cannot update global (platform-curated) items.
 * `findByIdAndProfessionalProfileId` returns null for global items,
 * producing a CatalogItemNotFoundError (ADR-0025 — 404 semantics).
 * Therefore `TemplateVersionChanged` is never emitted for global items.
 */
export class UpdateCatalogItemContent {
  constructor(
    private readonly catalogItemRepository: ICatalogItemRepository,
    private readonly eventPublisher: ICatalogEventPublisher,
  ) {}

  async execute(
    dto: UpdateCatalogItemContentInputDTO,
  ): Promise<DomainResult<UpdateCatalogItemContentOutputDTO>> {
    // 1. Validate professionalProfileId (ADR-0025)
    const profileIdResult = UniqueEntityId.create(dto.professionalProfileId);
    if (profileIdResult.isLeft()) return left(profileIdResult.value);

    // 2. Validate catalogItemId
    const itemIdResult = UniqueEntityId.create(dto.catalogItemId);
    if (itemIdResult.isLeft()) return left(itemIdResult.value);

    // 3. Validate new name if provided
    let newName: CatalogItemName | undefined;
    if (dto.name !== undefined) {
      const nameResult = CatalogItemName.create(dto.name);
      if (nameResult.isLeft()) return left(nameResult.value);
      newName = nameResult.value;
    }

    // 4. Scoped lookup — returns null for wrong tenant and for global items (ADR-0025)
    const item = await this.catalogItemRepository.findByIdAndProfessionalProfileId(
      dto.catalogItemId,
      dto.professionalProfileId,
    );

    if (!item) {
      return left(new CatalogItemNotFoundError(dto.catalogItemId));
    }

    // 5. Capture version before mutation for the domain event payload
    const previousVersion = item.contentVersion;

    // 6. Attempt content update (checks ARCHIVED guard, increments contentVersion)
    const updateResult = item.updateContent({
      ...(newName !== undefined ? { name: newName } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.muscleGroups !== undefined ? { muscleGroups: dto.muscleGroups } : {}),
      ...(dto.instructions !== undefined ? { instructions: dto.instructions } : {}),
      ...(dto.mediaUrl !== undefined ? { mediaUrl: dto.mediaUrl } : {}),
    });

    if (updateResult.isLeft()) return left(updateResult.value);

    await this.catalogItemRepository.save(item);

    // 7. Dispatch TemplateVersionChanged post-save (ADR-0009 §4, §7).
    // `findByIdAndProfessionalProfileId` guarantees professionalProfileId is non-null.
    await this.eventPublisher.publishTemplateVersionChanged(
      new TemplateVersionChangedEvent(item.id, dto.professionalProfileId, {
        catalogItemId: item.id,
        professionalProfileId: dto.professionalProfileId,
        previousVersion,
        newVersion: item.contentVersion,
      }),
    );

    return right({
      catalogItemId: item.id,
      status: item.status,
      name: item.name.value,
      contentVersion: item.contentVersion,
      description: item.description,
      category: item.category,
      muscleGroups: item.muscleGroups,
      instructions: item.instructions,
      mediaUrl: item.mediaUrl,
    });
  }
}
