import { AggregateRoot, UTCDateTime, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { CatalogItemType } from '../enums/catalog-item-type.js';
import { CatalogItemStatus } from '../enums/catalog-item-status.js';
import { CatalogItemName } from '../value-objects/catalog-item-name.js';
import { CatalogItemArchivedError } from '../errors/catalog-item-archived-error.js';
import { InvalidCatalogItemTransitionError } from '../errors/invalid-catalog-item-transition-error.js';

export interface CatalogItemProps {
  /**
   * Tenant isolation key (ADR-0025).
   *
   * `null`  → platform-curated global resource. Visible to all professionals.
   *           Read-only from any professional's perspective.
   * `string` → custom resource owned by this professional only.
   *            Visible only to the owning professional.
   *
   * Immutable after creation.
   */
  professionalProfileId: string | null;

  /**
   * Resource type discriminator (ADR-0001 §1).
   * Only EXERCISE is active in MVP.
   * Immutable after creation.
   */
  type: CatalogItemType;

  /** Lifecycle state (ADR-0011 §7). */
  status: CatalogItemStatus;

  /** Human-readable name. 1–120 chars. */
  name: CatalogItemName;

  /**
   * Content version counter (ADR-0011 §4).
   * Starts at 1. Increments on every successful `updateContent()` call.
   * Snapshots in ExerciseAssignment capture this value at prescription time.
   */
  contentVersion: number;

  /** Optional free-text description. */
  description: string | null;

  // ── EXERCISE-specific content (ADR-0011 §2) ───────────────────────────────
  // Populated when type = EXERCISE. Null for future non-exercise types.

  /**
   * Exercise category. Examples: 'STRENGTH', 'CARDIO', 'MOBILITY', 'FLEXIBILITY'.
   * Free-form string; not an enum to allow professional customisation.
   */
  category: string | null;

  /**
   * Muscle groups targeted by this exercise.
   * Examples: ['CHEST', 'TRICEPS'], ['QUADRICEPS', 'GLUTES'].
   * Empty array when not specified.
   */
  muscleGroups: string[];

  /**
   * Step-by-step execution instructions. May contain formatting markup.
   * Embedded verbatim in the ExerciseAssignment snapshot (ADR-0011 §2).
   */
  instructions: string | null;

  /**
   * URL of a demonstration video or image at snapshot time (ADR-0011 §2).
   * Null when no media is associated.
   */
  mediaUrl: string | null;

  // ── Temporal (ADR-0010) ───────────────────────────────────────────────────

  /** UTC instant of creation. Immutable. */
  createdAtUtc: UTCDateTime;

  /** UTC instant when the item was deprecated. Null until deprecated. */
  deprecatedAtUtc: UTCDateTime | null;

  /** UTC instant when the item was archived. Null until archived. */
  archivedAtUtc: UTCDateTime | null;
}

/**
 * CatalogItem aggregate root — reusable resource definition in the Catalog
 * bounded context (ADR-0001 §1, ADR-0001 §2).
 *
 * ## Bounded context
 *
 * Belongs exclusively to the Catalog bounded context. Has no dependency on
 * the Deliverable, Execution, Billing, or Scheduling bounded contexts.
 * Deliverables embed immutable snapshots of CatalogItems at prescription time
 * and never reference live CatalogItem state afterwards (ADR-0011 §1).
 *
 * ## Ownership model
 *
 * A CatalogItem is either:
 * - **Global** (`professionalProfileId = null`): platform-curated, visible to all
 *   professionals, read-only from any professional's perspective.
 * - **Custom** (`professionalProfileId = UUID`): owned by one professional,
 *   visible only to that professional, mutable by that professional.
 *
 * Ownership is immutable after creation. Visibility enforcement is the
 * responsibility of the repository (ADR-0025).
 *
 * ## Lifecycle (ADR-0011 §7)
 *
 * ```
 * ACTIVE ──────────────────► DEPRECATED ──► ARCHIVED (terminal)
 *   │                                            ▲
 *   └────────────────────────────────────────────┘
 * ```
 *
 * ARCHIVED is a terminal state. No transitions out of ARCHIVED.
 *
 * ## Content versioning (ADR-0011 §4)
 *
 * `contentVersion` starts at 1 and increments with every `updateContent()`
 * call. ExerciseAssignment snapshots capture this value at prescription time,
 * enabling auditors to determine which catalog version was active when a
 * Deliverable was prescribed.
 *
 * ## Soft delete (ADR-0013 Tier 3)
 *
 * CatalogItem supports soft delete (via `deletedAt` in the persistence layer).
 * Hard delete is prohibited. Soft-deleted items are invisible to standard
 * queries but retained for audit. This is a persistence concern; the domain
 * aggregate does not model `deletedAt`.
 *
 * ## Concurrency (ADR-0006)
 *
 * Carries optimistic locking `version` via AggregateRoot base class.
 *
 * ## Domain events
 *
 * No domain events are emitted by CatalogItem in MVP. There are no registered
 * cross-context consumers for Catalog events (ADR-0009 §5, ADR-0001 §5).
 */
export class CatalogItem extends AggregateRoot<CatalogItemProps> {
  private constructor(id: string, props: CatalogItemProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new CatalogItem in ACTIVE status.
   *
   * CatalogItems are ready to use immediately upon creation — there is no
   * DRAFT state (unlike Deliverable). The name value object must be
   * constructed before calling this factory.
   */
  static create(props: {
    id?: string;
    professionalProfileId: string | null;
    type: CatalogItemType;
    name: CatalogItemName;
    description?: string | null;
    category?: string | null;
    muscleGroups?: string[];
    instructions?: string | null;
    mediaUrl?: string | null;
    createdAtUtc: UTCDateTime;
  }): DomainResult<CatalogItem> {
    const id = props.id ?? generateId();

    const item = new CatalogItem(id, {
      professionalProfileId: props.professionalProfileId,
      type: props.type,
      status: CatalogItemStatus.ACTIVE,
      name: props.name,
      contentVersion: 1,
      description: props.description ?? null,
      category: props.category ?? null,
      muscleGroups: props.muscleGroups ?? [],
      instructions: props.instructions ?? null,
      mediaUrl: props.mediaUrl ?? null,
      createdAtUtc: props.createdAtUtc,
      deprecatedAtUtc: null,
      archivedAtUtc: null,
    });

    return right(item);
  }

  static reconstitute(id: string, props: CatalogItemProps, version: number): CatalogItem {
    return new CatalogItem(id, props, version);
  }

  // ── State transitions (ADR-0011 §7) ─────────────────────────────────────

  /**
   * ACTIVE → DEPRECATED.
   *
   * Marks the item as not recommended for new prescriptions while keeping it
   * available. Existing snapshots in Deliverables are unaffected (ADR-0011 §3).
   */
  deprecate(): DomainResult<void> {
    if (this.props.status !== CatalogItemStatus.ACTIVE) {
      return left(
        new InvalidCatalogItemTransitionError(this.props.status, CatalogItemStatus.DEPRECATED),
      );
    }

    this.props.status = CatalogItemStatus.DEPRECATED;
    this.props.deprecatedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /**
   * ACTIVE | DEPRECATED → ARCHIVED (terminal).
   *
   * Permanently retires the item. No new prescriptions may reference an
   * ARCHIVED item. Existing snapshots in Deliverables are unaffected (ADR-0011 §3).
   * No transitions out of ARCHIVED.
   */
  archive(): DomainResult<void> {
    const allowed: CatalogItemStatus[] = [CatalogItemStatus.ACTIVE, CatalogItemStatus.DEPRECATED];

    if (!allowed.includes(this.props.status)) {
      return left(
        new InvalidCatalogItemTransitionError(this.props.status, CatalogItemStatus.ARCHIVED),
      );
    }

    this.props.status = CatalogItemStatus.ARCHIVED;
    this.props.archivedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  // ── Content mutation (ACTIVE | DEPRECATED only) ──────────────────────────

  /**
   * Updates the mutable content fields of this CatalogItem.
   *
   * Permitted in ACTIVE and DEPRECATED states. Blocked when ARCHIVED.
   * At least one field must be provided.
   * `contentVersion` is incremented on every successful call (ADR-0011 §4).
   *
   * Existing snapshots in Deliverables are never affected by content updates.
   * Only new prescriptions created after this call will see the new content.
   */
  updateContent(fields: {
    name?: CatalogItemName;
    description?: string | null;
    category?: string | null;
    muscleGroups?: string[];
    instructions?: string | null;
    mediaUrl?: string | null;
  }): DomainResult<void> {
    if (this.props.status === CatalogItemStatus.ARCHIVED) {
      return left(new CatalogItemArchivedError(this.id));
    }

    if (fields.name !== undefined) {
      this.props.name = fields.name;
    }
    if (fields.description !== undefined) {
      this.props.description = fields.description;
    }
    if (fields.category !== undefined) {
      this.props.category = fields.category;
    }
    if (fields.muscleGroups !== undefined) {
      this.props.muscleGroups = fields.muscleGroups;
    }
    if (fields.instructions !== undefined) {
      this.props.instructions = fields.instructions;
    }
    if (fields.mediaUrl !== undefined) {
      this.props.mediaUrl = fields.mediaUrl;
    }

    this.props.contentVersion += 1;
    return right(undefined);
  }

  // ── Query methods ────────────────────────────────────────────────────────

  /** True when the item is available for new Deliverable prescriptions. */
  isActive(): boolean {
    return this.props.status === CatalogItemStatus.ACTIVE;
  }

  /** True when the item is available for prescription but not recommended. */
  isDeprecated(): boolean {
    return this.props.status === CatalogItemStatus.DEPRECATED;
  }

  /** True when the item is permanently retired and cannot be prescribed. */
  isArchived(): boolean {
    return this.props.status === CatalogItemStatus.ARCHIVED;
  }

  /**
   * True when the item is available for use in new Deliverable prescriptions.
   * Both ACTIVE and DEPRECATED items may be prescribed (ADR-0011 §7).
   */
  isAvailableForPrescription(): boolean {
    return (
      this.props.status === CatalogItemStatus.ACTIVE ||
      this.props.status === CatalogItemStatus.DEPRECATED
    );
  }

  /** True when this is a platform-curated global resource. */
  isGlobal(): boolean {
    return this.props.professionalProfileId === null;
  }

  /** True when this is a custom resource owned by the given professional. */
  isOwnedBy(professionalProfileId: string): boolean {
    return this.props.professionalProfileId === professionalProfileId;
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get professionalProfileId(): string | null {
    return this.props.professionalProfileId;
  }

  get type(): CatalogItemType {
    return this.props.type;
  }

  get status(): CatalogItemStatus {
    return this.props.status;
  }

  get name(): CatalogItemName {
    return this.props.name;
  }

  get contentVersion(): number {
    return this.props.contentVersion;
  }

  get description(): string | null {
    return this.props.description;
  }

  get category(): string | null {
    return this.props.category;
  }

  /** Returns a shallow copy — callers must not mutate the returned array. */
  get muscleGroups(): string[] {
    return [...this.props.muscleGroups];
  }

  get instructions(): string | null {
    return this.props.instructions;
  }

  get mediaUrl(): string | null {
    return this.props.mediaUrl;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get deprecatedAtUtc(): UTCDateTime | null {
    return this.props.deprecatedAtUtc;
  }

  get archivedAtUtc(): UTCDateTime | null {
    return this.props.archivedAtUtc;
  }
}
