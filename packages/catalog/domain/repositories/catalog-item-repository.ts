import type { IRepository, PageRequest, PaginatedResult, UniqueEntityId } from '@fittrack/core';
import type { CatalogItem } from '../aggregates/catalog-item.js';
import type { CatalogItemStatus } from '../enums/catalog-item-status.js';
import type { CatalogItemType } from '../enums/catalog-item-type.js';

/**
 * Repository interface for the CatalogItem aggregate root (ADR-0004 §2).
 *
 * ## Ownership and visibility model
 *
 * CatalogItems are either **global** (`professionalProfileId = null`) or
 * **custom** (`professionalProfileId = UUID`). The repository enforces
 * visibility rules:
 *
 * - Global items are visible to **all** professionals (read only).
 * - Custom items are visible only to their owning professional.
 *
 * Two lookup families exist to reflect the two access patterns:
 *
 * ### Mutation lookups (custom items only)
 *
 * `findByIdAndProfessionalProfileId` returns the item only when its
 * `professionalProfileId` matches the caller's. Global items (null owner)
 * are never returned by this method — consistent with ADR-0025 (cross-tenant
 * and cross-ownership access returns 404, never 403).
 *
 * ### Read lookups (global + own)
 *
 * `findByIdForProfessional` returns the item when it is global OR when its
 * `professionalProfileId` matches the caller's. This is the correct lookup
 * for prescription-time resolution.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * Every method that returns custom CatalogItems must scope the query to the
 * provided `professionalProfileId`. Cross-tenant queries are never permitted.
 */
export interface ICatalogItemRepository extends IRepository<CatalogItem> {
  /**
   * @deprecated
   * This method is NOT tenant-scoped. Do not use it in Catalog use cases.
   *
   * - For **read operations** (prescription-time resolution), use `findByIdForProfessional`.
   * - For **mutation operations** (deprecate, archive, updateContent), use
   *   `findByIdAndProfessionalProfileId`.
   *
   * Calling this method bypasses ADR-0025 tenant isolation and could expose
   * items belonging to other tenants. It is retained only because it is
   * inherited from `IRepository<CatalogItem>`.
   */
  findById(id: UniqueEntityId): Promise<CatalogItem | null>;

  /**
   * Finds a CatalogItem by id, scoped to items that are:
   * - Owned by `professionalProfileId`, OR
   * - Global (professionalProfileId = null).
   *
   * Use this method for **read operations** (e.g., resolving at prescription time).
   * Returns null when the item does not exist or belongs to a different tenant.
   */
  findByIdForProfessional(id: string, professionalProfileId: string): Promise<CatalogItem | null>;

  /**
   * Finds a CatalogItem by id, scoped to items owned **exclusively** by
   * `professionalProfileId`. Global items are never returned.
   *
   * Use this method for **mutation operations** (deprecate, archive,
   * updateContent). Satisfies ADR-0025: a professional who attempts to
   * mutate a global item receives the same 404 as if the item didn't exist.
   */
  findByIdAndProfessionalProfileId(
    id: string,
    professionalProfileId: string,
  ): Promise<CatalogItem | null>;

  /**
   * Returns a paginated list of CatalogItems visible to the given professional.
   *
   * Includes:
   * - All global items (professionalProfileId = null).
   * - All custom items owned by `professionalProfileId`.
   *
   * Use this for listing catalog resources during prescription (read-only view).
   */
  findManyVisibleToProfessional(
    professionalProfileId: string,
    page: PageRequest,
    filters?: {
      status?: CatalogItemStatus;
      type?: CatalogItemType;
    },
  ): Promise<PaginatedResult<CatalogItem>>;

  /**
   * Returns a paginated list of CatalogItems owned by the given professional.
   *
   * Does NOT include global items. Use for the professional's own library
   * management view.
   */
  findManyByProfessionalProfileId(
    professionalProfileId: string,
    page: PageRequest,
    filters?: {
      status?: CatalogItemStatus;
      type?: CatalogItemType;
    },
  ): Promise<PaginatedResult<CatalogItem>>;
}
