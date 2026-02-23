// ── Enums ─────────────────────────────────────────────────────────────────────
export { CatalogItemType } from './domain/enums/catalog-item-type.js';
export { CatalogItemStatus } from './domain/enums/catalog-item-status.js';

// ── Errors ────────────────────────────────────────────────────────────────────
export { CatalogErrorCodes } from './domain/errors/catalog-error-codes.js';
export type { CatalogErrorCode } from './domain/errors/catalog-error-codes.js';
export { InvalidCatalogItemError } from './domain/errors/invalid-catalog-item-error.js';
export { CatalogItemNotFoundError } from './domain/errors/catalog-item-not-found-error.js';
export { CatalogItemArchivedError } from './domain/errors/catalog-item-archived-error.js';
export { InvalidCatalogItemTransitionError } from './domain/errors/invalid-catalog-item-transition-error.js';

// ── Value Objects ─────────────────────────────────────────────────────────────
export { CatalogItemName } from './domain/value-objects/catalog-item-name.js';

// ── Aggregates ────────────────────────────────────────────────────────────────
export { CatalogItem } from './domain/aggregates/catalog-item.js';
export type { CatalogItemProps } from './domain/aggregates/catalog-item.js';

// ── Repositories ──────────────────────────────────────────────────────────────
export type { ICatalogItemRepository } from './domain/repositories/catalog-item-repository.js';

// ── DTOs ──────────────────────────────────────────────────────────────────────
export type { CreateCatalogItemInputDTO } from './application/dtos/create-catalog-item-input-dto.js';
export type { CreateCatalogItemOutputDTO } from './application/dtos/create-catalog-item-output-dto.js';
export type { DeprecateCatalogItemInputDTO } from './application/dtos/deprecate-catalog-item-input-dto.js';
export type { DeprecateCatalogItemOutputDTO } from './application/dtos/deprecate-catalog-item-output-dto.js';
export type { ArchiveCatalogItemInputDTO } from './application/dtos/archive-catalog-item-input-dto.js';
export type { ArchiveCatalogItemOutputDTO } from './application/dtos/archive-catalog-item-output-dto.js';
export type { UpdateCatalogItemContentInputDTO } from './application/dtos/update-catalog-item-content-input-dto.js';
export type { UpdateCatalogItemContentOutputDTO } from './application/dtos/update-catalog-item-content-output-dto.js';

// ── Use Cases ─────────────────────────────────────────────────────────────────
export { CreateCatalogItem } from './application/use-cases/create-catalog-item.js';
export { DeprecateCatalogItem } from './application/use-cases/deprecate-catalog-item.js';
export { ArchiveCatalogItem } from './application/use-cases/archive-catalog-item.js';
export { UpdateCatalogItemContent } from './application/use-cases/update-catalog-item-content.js';
