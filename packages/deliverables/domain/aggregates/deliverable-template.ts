import { AggregateRoot, UTCDateTime, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { TemplateStatus } from '../enums/template-status.js';
import type { TemplateStatus as TemplateStatusType } from '../enums/template-status.js';
import type { DeliverableType as DeliverableTypeValue } from '../enums/deliverable-type.js';
import { TemplateName } from '../value-objects/template-name.js';
import { TemplateVersion } from '../value-objects/template-version.js';
import { TemplateParameter } from '../value-objects/template-parameter.js';
import type { ITemplateStructure } from '../value-objects/template-structure/i-template-structure.js';
import { InvalidTemplateTransitionError } from '../errors/invalid-template-transition-error.js';
import { TemplateCannotBeEditedError } from '../errors/template-cannot-be-edited-error.js';
import { TemplateNotActiveError } from '../errors/template-not-active-error.js';

export interface DeliverableTemplateProps {
  /**
   * Owning professional — tenant isolation key (ADR-0025). Immutable.
   * Cross-aggregate reference: ID only (ADR-0047).
   */
  professionalProfileId: string;

  /** Human-readable name. 3–100 chars. Mutable only in DRAFT. */
  name: TemplateName;

  /** Optional free-text description. Mutable only in DRAFT. */
  description: string | null;

  /** Category of deliverable this template produces. Immutable. */
  type: DeliverableTypeValue;

  /** Lifecycle state. */
  status: TemplateStatusType;

  /** Monotonically increasing version number. v1, v2, etc. */
  version: TemplateVersion;

  /**
   * ID of the immediately preceding version, or null for the first version.
   * Cross-aggregate reference: ID only (ADR-0047).
   */
  previousVersionId: string | null;

  /**
   * Typed structure for this template. Content depends on `type`.
   * Mutable only in DRAFT.
   */
  structure: ITemplateStructure;

  /**
   * Configurable parameters that can be overridden on instantiation.
   * Mutable only in DRAFT.
   */
  parameters: TemplateParameter[];

  /** Number of times this template has been instantiated. */
  usageCount: number;

  /** Optional tags for discoverability. Mutable only in DRAFT. */
  tags: string[];

  /**
   * UTC instant of creation. Immutable.
   *
   * ## Why no `logicalDay` here? (ADR-0010)
   *
   * `DeliverableTemplate` intentionally omits `logicalDay` and `timezoneUsed`.
   * A template is an atemporal blueprint — it is not a business fact tied to a
   * calendar day or the professional's local timezone. Unlike `Deliverable`
   * (which records the day a prescription was issued to a specific client),
   * a template's creation is administrative metadata.
   *
   * If a future requirement introduces a validity window (e.g. "available from
   * 2026-03-01 to 2026-12-31"), a dedicated `validFrom`/`validUntil` date-range
   * value object should be added rather than repurposing `logicalDay`.
   */
  createdAtUtc: UTCDateTime;

  /** UTC instant of last update. Updated on each mutation. */
  updatedAtUtc: UTCDateTime;

  /** UTC instant when activated. Null until activation. */
  activatedAtUtc: UTCDateTime | null;

  /** UTC instant when archived. Null until archival. */
  archivedAtUtc: UTCDateTime | null;
}

/**
 * DeliverableTemplate aggregate root — a reusable prescription blueprint
 * that professionals can instantiate to create Deliverables rapidly.
 *
 * ## Bounded context
 *
 * Belongs to the Deliverables bounded context. A template is a pattern for
 * creating Deliverables, not a Deliverable itself.
 *
 * ## Lifecycle
 *
 * ```
 * DRAFT → ACTIVE  (activate) — locks structure; enables instantiation
 * DRAFT → ARCHIVED (archive) — abandon before activation
 * ACTIVE → ARCHIVED (archive) — retire; existing deliverables unaffected
 * ARCHIVED → ACTIVE — NOT permitted (create a new version instead)
 * ```
 *
 * ## Immutability of ACTIVE templates
 *
 * Once ACTIVE, structure and parameters cannot be modified directly.
 * Use `CreateTemplateVersion` to produce a new DRAFT (v+1).
 *
 * ## Snapshot semantics (ADR-0011)
 *
 * When `canBeInstantiated()` is true, the Application layer calls
 * `structure.toSnapshot()` to produce a one-time content copy for a new
 * Deliverable. Changes to the template after instantiation do not affect
 * already-created Deliverables.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * `professionalProfileId` is immutable and non-null. All repository queries
 * must include it as a scoping parameter.
 *
 * ## Cross-aggregate references (ADR-0047)
 *
 * Template never holds live object references to Deliverable, Client, or
 * any other aggregate. `previousVersionId` is a string ID reference only.
 */
export class DeliverableTemplate extends AggregateRoot<DeliverableTemplateProps> {
  private constructor(id: string, props: DeliverableTemplateProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new DeliverableTemplate in DRAFT status at version 1.
   */
  static create(props: {
    id?: string;
    professionalProfileId: string;
    name: TemplateName;
    description?: string | null;
    type: DeliverableTypeValue;
    structure: ITemplateStructure;
    parameters?: TemplateParameter[];
    tags?: string[];
    createdAtUtc: UTCDateTime;
  }): DomainResult<DeliverableTemplate> {
    const versionResult = TemplateVersion.create(1);
    /* v8 ignore next */
    if (versionResult.isLeft()) return left(versionResult.value);

    const id = props.id ?? generateId();
    const now = props.createdAtUtc;

    const template = new DeliverableTemplate(
      id,
      {
        professionalProfileId: props.professionalProfileId,
        name: props.name,
        description: props.description ?? null,
        type: props.type,
        status: TemplateStatus.DRAFT,
        version: versionResult.value,
        previousVersionId: null,
        structure: props.structure,
        parameters: props.parameters ? [...props.parameters] : [],
        usageCount: 0,
        tags: props.tags ? [...props.tags] : [],
        createdAtUtc: now,
        updatedAtUtc: now,
        activatedAtUtc: null,
        archivedAtUtc: null,
      },
      0,
    );

    return right(template);
  }

  static reconstitute(
    id: string,
    props: DeliverableTemplateProps,
    version: number,
  ): DeliverableTemplate {
    return new DeliverableTemplate(id, props, version);
  }

  // ── Content mutation (DRAFT only) ────────────────────────────────────────

  /**
   * Updates the mutable fields of a DRAFT template.
   * Only name, description, structure, parameters, and tags may be changed.
   * Returns Left<TemplateCannotBeEditedError> if not DRAFT.
   */
  update(changes: {
    name?: TemplateName;
    description?: string | null;
    structure?: ITemplateStructure;
    parameters?: TemplateParameter[];
    tags?: string[];
  }): DomainResult<void> {
    if (this.props.status !== TemplateStatus.DRAFT) {
      return left(new TemplateCannotBeEditedError(this.id));
    }

    if (changes.name !== undefined) this.props.name = changes.name;
    if (changes.description !== undefined) this.props.description = changes.description;
    if (changes.structure !== undefined) this.props.structure = changes.structure;
    if (changes.parameters !== undefined) this.props.parameters = [...changes.parameters];
    if (changes.tags !== undefined) this.props.tags = [...changes.tags];
    this.props.updatedAtUtc = UTCDateTime.now();

    return right(undefined);
  }

  // ── State transitions ─────────────────────────────────────────────────────

  /**
   * DRAFT → ACTIVE.
   *
   * Validates the structure before transitioning. An invalid structure
   * (e.g. empty session list) prevents activation.
   *
   * Returns Left if not DRAFT or if structure validation fails.
   */
  activate(): DomainResult<void> {
    if (this.props.status !== TemplateStatus.DRAFT) {
      return left(new InvalidTemplateTransitionError(this.props.status, TemplateStatus.ACTIVE));
    }

    const validationResult = this.props.structure.validate();
    if (validationResult.isLeft()) return left(validationResult.value);

    this.props.status = TemplateStatus.ACTIVE;
    this.props.activatedAtUtc = UTCDateTime.now();
    this.props.updatedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /**
   * DRAFT | ACTIVE → ARCHIVED (terminal).
   *
   * ARCHIVED → ARCHIVED is rejected. Existing Deliverables created from
   * this template are unaffected (ADR-0011 snapshot semantics).
   *
   * Returns Left<InvalidTemplateTransitionError> if already ARCHIVED.
   */
  archive(): DomainResult<void> {
    if (this.props.status === TemplateStatus.ARCHIVED) {
      return left(new InvalidTemplateTransitionError(this.props.status, TemplateStatus.ARCHIVED));
    }

    this.props.status = TemplateStatus.ARCHIVED;
    this.props.archivedAtUtc = UTCDateTime.now();
    this.props.updatedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /**
   * Creates a new DeliverableTemplate at version+1 from this ACTIVE template.
   *
   * The new template is in DRAFT status, with `previousVersionId` pointing to
   * this template's id, establishing an immutable version chain.
   *
   * Returns Left<TemplateNotActiveError> if this template is not ACTIVE.
   */
  createNewVersion(createdAtUtc: UTCDateTime): DomainResult<DeliverableTemplate> {
    if (this.props.status !== TemplateStatus.ACTIVE) {
      return left(new TemplateNotActiveError(this.id));
    }

    const nextVersion = this.props.version.increment();
    const newId = generateId();
    const now = createdAtUtc;

    const newTemplate = new DeliverableTemplate(
      newId,
      {
        professionalProfileId: this.props.professionalProfileId,
        name: this.props.name,
        description: this.props.description,
        type: this.props.type,
        status: TemplateStatus.DRAFT,
        version: nextVersion,
        previousVersionId: this.id,
        structure: this.props.structure,
        parameters: [...this.props.parameters],
        usageCount: 0,
        tags: [...this.props.tags],
        createdAtUtc: now,
        updatedAtUtc: now,
        activatedAtUtc: null,
        archivedAtUtc: null,
      },
      0,
    );

    return right(newTemplate);
  }

  /**
   * Increments the usage counter after a successful instantiation.
   *
   * Called by the Application layer (InstantiateDeliverableTemplate) after
   * creating and persisting the Deliverable (ADR-0009).
   */
  incrementUsage(): void {
    this.props.usageCount += 1;
    this.props.updatedAtUtc = UTCDateTime.now();
  }

  // ── Query helpers ──────────────────────────────────────────────────────────

  /** True when this template is in DRAFT status. */
  isDraft(): boolean {
    return this.props.status === TemplateStatus.DRAFT;
  }

  /** True when this template is in ACTIVE status. */
  isActive(): boolean {
    return this.props.status === TemplateStatus.ACTIVE;
  }

  /** True when this template has been archived. */
  isArchived(): boolean {
    return this.props.status === TemplateStatus.ARCHIVED;
  }

  /** True when a Deliverable can be instantiated from this template. */
  canBeInstantiated(): boolean {
    return this.props.status === TemplateStatus.ACTIVE;
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get name(): TemplateName {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get type(): DeliverableTypeValue {
    return this.props.type;
  }

  get status(): TemplateStatusType {
    return this.props.status;
  }

  get templateVersion(): TemplateVersion {
    return this.props.version;
  }

  get previousVersionId(): string | null {
    return this.props.previousVersionId;
  }

  get structure(): ITemplateStructure {
    return this.props.structure;
  }

  /** Returns a shallow copy — callers must not mutate the returned array. */
  get parameters(): ReadonlyArray<TemplateParameter> {
    return [...this.props.parameters];
  }

  get usageCount(): number {
    return this.props.usageCount;
  }

  /** Returns a shallow copy — callers must not mutate the returned array. */
  get tags(): ReadonlyArray<string> {
    return [...this.props.tags];
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get updatedAtUtc(): UTCDateTime {
    return this.props.updatedAtUtc;
  }

  get activatedAtUtc(): UTCDateTime | null {
    return this.props.activatedAtUtc;
  }

  get archivedAtUtc(): UTCDateTime | null {
    return this.props.archivedAtUtc;
  }
}
