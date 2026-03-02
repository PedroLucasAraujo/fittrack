import type { UniqueEntityId } from '../entities/unique-entity-id.js';

/**
 * Minimal base repository interface for all aggregate roots (ADR-0004 §2).
 *
 * Each aggregate root has a dedicated repository interface that extends or
 * mirrors this contract and adds domain-specific query methods. The naming
 * convention is `I{AggregateName}Repository`.
 *
 * Repository interfaces are defined in the **domain layer** of their owning
 * bounded context. Implementations live in the **infrastructure layer** and
 * use Prisma. See ADR-0004.
 *
 * ## Rules (ADR-0004 §4)
 *
 * - `findById` receives a `UniqueEntityId` — the typed domain identifier for
 *   aggregate roots (ADR-0047 §6). This prevents passing arbitrary strings and
 *   aligns the interface with the domain language.
 * - `findById` returns a complete, valid aggregate or `null`. Partial
 *   reconstruction is prohibited.
 * - All required associations are loaded eagerly. Lazy loading is prohibited.
 * - `save` handles both INSERT (new aggregate) and UPDATE (existing aggregate).
 *   The repository is responsible for detecting which is needed.
 *
 * @template T The aggregate root type this repository manages.
 */
export interface IRepository<T> {
  findById(id: UniqueEntityId): Promise<T | null>;
  save(entity: T): Promise<void>;
}
