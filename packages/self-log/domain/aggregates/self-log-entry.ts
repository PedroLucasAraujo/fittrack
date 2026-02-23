import { AggregateRoot, UTCDateTime, LogicalDay, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { EntrySource } from '../value-objects/entry-source.js';
import type { SelfLogNote } from '../value-objects/self-log-note.js';
import { InvalidSelfLogEntryError } from '../errors/invalid-self-log-entry-error.js';
import { SelfLogAlreadyAnonymizedError } from '../errors/self-log-already-anonymized-error.js';

/** UUIDv4 regex (ADR-0047 §6). */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Maximum character length for the unit label (e.g., "reps", "kg", "min"). */
const UNIT_MAX_LENGTH = 30;

export interface SelfLogEntryProps {
  /**
   * Client who logged this entry (cross-aggregate ref, ADR-0047). Immutable.
   */
  clientId: string;

  /**
   * Owning professional — tenant isolation key (ADR-0025). Immutable.
   * Always required: even source=SELF entries belong to a professional's
   * PersonalMode context (PersonalModeActivated entitlement, ADR-0009).
   * Cross-aggregate reference: ID only (ADR-0047).
   */
  professionalProfileId: string;

  /**
   * Discriminates how this entry was created (ADR-0014 §3). Immutable.
   * SELF: manually logged by the client.
   * EXECUTION: projected from a confirmed Execution record.
   */
  source: EntrySource;

  /**
   * Optional cross-aggregate reference to the Deliverable associated with
   * this entry (ADR-0047 — ID only). Null for unstructured SELF entries.
   * Immutable.
   */
  deliverableId: string | null;

  /**
   * Optional user-authored note describing the activity.
   * LGPD Category A (health context) — nulled by `anonymize()` (ADR-0037).
   */
  note: SelfLogNote | null;

  /**
   * Numeric measurement for the logged activity (e.g., 30, 1.5, 85).
   * LGPD Category A — nulled by `anonymize()` (ADR-0037).
   * Must be finite and ≥ 0 when provided.
   */
  value: number | null;

  /**
   * Unit label for the metric value (e.g., "reps", "kg", "min", "km").
   * LGPD Category A — nulled by `anonymize()` (ADR-0037).
   * 1–30 characters when provided.
   */
  unit: string | null;

  /**
   * UTC instant when the logged activity occurred (ADR-0010). Immutable.
   * For source=EXECUTION, this mirrors the Execution's `occurredAtUtc`.
   */
  occurredAtUtc: UTCDateTime;

  /**
   * Calendar date of the activity in the user's timezone (ADR-0010).
   * Computed once from `occurredAtUtc` + `timezoneUsed` at creation.
   * Never recomputed (ADR-0010 §5). Immutable.
   */
  logicalDay: LogicalDay;

  /**
   * IANA timezone used to compute `logicalDay` (ADR-0010). Immutable.
   */
  timezoneUsed: string;

  /** UTC instant when this record was created in the system. Immutable. */
  createdAtUtc: UTCDateTime;

  /**
   * If this entry supersedes a prior SelfLogEntry (append-only correction model),
   * this holds the ID of the superseded entry.
   * Cross-aggregate reference: ID only (ADR-0047). Immutable.
   * Null for original (non-correction) entries.
   */
  correctedEntryId: string | null;

  /**
   * Set when this entry has been soft-deleted via LGPD erasure (ADR-0037).
   * Null for active entries. Set by `anonymize()`.
   */
  deletedAtUtc: UTCDateTime | null;
}

/**
 * SelfLogEntry aggregate root — a single personal activity log record
 * (ADR-0047, Execution/PersonalMode bounded context).
 *
 * ## Role in the system (ADR-0014)
 *
 * SelfLog is NOT authoritative. It sits below Metric in the derivation hierarchy:
 * ```
 * Execution (source of truth)  ←── never altered by SelfLog
 *   ↓ derivation
 * Metric (derived, versioned)
 *   ↓ projection
 * SelfLog (projection or manual log) / Read Model / Dashboard
 * ```
 * source=EXECUTION entries are projections of confirmed Execution records.
 * source=SELF entries are personal tracking data; never used in domain rule
 * evaluation (AccessGrant validation, metric derivation — ADR-0014 §4).
 *
 * ## Immutability (append-only model)
 *
 * Entries are immutable after creation. Corrections are represented as new
 * SelfLogEntry instances with `correctedEntryId` pointing to the superseded entry.
 * This mirrors the ExecutionCorrectionRecorded compensating event pattern (ADR-0005 §4).
 *
 * ## Temporal fields (ADR-0010 — CANONICAL)
 *
 * Three required temporal fields:
 * - `occurredAtUtc`: UTC instant of the activity.
 * - `logicalDay`: calendar date in the user's timezone (computed once, immutable).
 * - `timezoneUsed`: IANA timezone used to derive `logicalDay`.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * `professionalProfileId` is immutable and non-null. All repository queries
 * include it as a mandatory scoping parameter. Cross-tenant access returns null
 * (404, not 403).
 *
 * ## LGPD / Privacy (ADR-0037)
 *
 * Health data (value, unit, note) is Category A. `anonymize()` nulls these
 * fields and sets `deletedAtUtc`. The record structure is preserved; only
 * content is erased.
 *
 * ## Concurrency (ADR-0006)
 *
 * Carries optimistic locking `version` via AggregateRoot base class.
 *
 * ## Domain events (ADR-0009)
 *
 * No events are emitted by this aggregate. Per ADR-0009 §3, the application
 * layer (use cases) constructs and dispatches `SelfLogRecordedEvent` after
 * the repository commits the aggregate.
 */
export class SelfLogEntry extends AggregateRoot<SelfLogEntryProps> {
  private constructor(id: string, props: SelfLogEntryProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new SelfLogEntry.
   *
   * ## Invariants enforced here
   *
   * 1. `value` must be finite and ≥ 0 if provided.
   * 2. `unit` must be 1–30 characters if provided.
   * 3. `correctedEntryId` must be a valid UUIDv4 if provided.
   *
   * Source consistency (EXECUTION ↔ sourceId) is enforced by the `EntrySource`
   * value object factories and is not re-validated here.
   *
   * All temporal value objects (`occurredAtUtc`, `logicalDay`) must be
   * pre-constructed by the Application layer. The factory trusts them.
   *
   * The Application layer is responsible for cross-context validations
   * (tenant verification, existence checks) before calling this factory.
   */
  static create(props: {
    id?: string;
    clientId: string;
    professionalProfileId: string;
    source: EntrySource;
    deliverableId?: string | null;
    note?: SelfLogNote | null;
    value?: number | null;
    unit?: string | null;
    occurredAtUtc: UTCDateTime;
    logicalDay: LogicalDay;
    timezoneUsed: string;
    createdAtUtc: UTCDateTime;
    correctedEntryId?: string | null;
  }): DomainResult<SelfLogEntry> {
    // Invariant 1: value must be finite and non-negative
    const value = props.value ?? null;
    if (value !== null) {
      if (!Number.isFinite(value) || value < 0) {
        return left(new InvalidSelfLogEntryError('value must be a finite non-negative number'));
      }
    }

    // Invariant 2: unit length
    const unit = props.unit ?? null;
    if (unit !== null) {
      const trimmedUnit = unit.trim();
      if (trimmedUnit.length < 1 || trimmedUnit.length > UNIT_MAX_LENGTH) {
        return left(
          new InvalidSelfLogEntryError(
            `unit must be 1–${UNIT_MAX_LENGTH} characters. Received length: ${unit.length}`,
            { unit },
          ),
        );
      }
    }

    // Invariant 3: correctedEntryId must be UUIDv4 if provided
    const correctedEntryId = props.correctedEntryId ?? null;
    if (correctedEntryId !== null && !UUID_V4_REGEX.test(correctedEntryId)) {
      return left(
        new InvalidSelfLogEntryError(
          `correctedEntryId must be a valid UUIDv4. Received: "${correctedEntryId}"`,
          { correctedEntryId },
        ),
      );
    }

    const id = props.id ?? generateId();

    const entry = new SelfLogEntry(
      id,
      {
        clientId: props.clientId,
        professionalProfileId: props.professionalProfileId,
        source: props.source,
        deliverableId: props.deliverableId ?? null,
        note: props.note ?? null,
        value,
        unit: unit !== null ? unit.trim() : null,
        occurredAtUtc: props.occurredAtUtc,
        logicalDay: props.logicalDay,
        timezoneUsed: props.timezoneUsed,
        createdAtUtc: props.createdAtUtc,
        correctedEntryId,
        deletedAtUtc: null,
      },
      0,
    );

    return right(entry);
  }

  /**
   * Reconstitutes a SelfLogEntry from persisted storage.
   * No validation is performed — trusts the data integrity of the repository.
   */
  static reconstitute(id: string, props: SelfLogEntryProps, version: number): SelfLogEntry {
    return new SelfLogEntry(id, props, version);
  }

  // ── LGPD erasure (ADR-0037) ───────────────────────────────────────────────

  /**
   * Applies LGPD field-level anonymization to this SelfLogEntry (ADR-0037 §5).
   *
   * Erases all Category A health data:
   * - `value` → null
   * - `unit`  → null
   * - `note`  → null
   * Sets `deletedAtUtc` to mark the entry as erased.
   *
   * The record structure (IDs, source, logicalDay, timestamps) is preserved
   * so that audit trails and projection consistency are maintained.
   * source=EXECUTION entries are also eligible for anonymization — the underlying
   * Execution record is immutable (ADR-0005) and unaffected.
   *
   * @returns Left<SelfLogAlreadyAnonymizedError> if already anonymized.
   * @returns Right<void> on success.
   */
  anonymize(deletedAtUtc: UTCDateTime): DomainResult<void> {
    if (this.props.deletedAtUtc !== null) {
      return left(new SelfLogAlreadyAnonymizedError());
    }

    this.props.value = null;
    this.props.unit = null;
    this.props.note = null;
    this.props.deletedAtUtc = deletedAtUtc;

    return right(undefined);
  }

  // ── Query helpers ─────────────────────────────────────────────────────────

  /** True when this entry has been anonymized (LGPD erasure applied). */
  get isDeleted(): boolean {
    return this.props.deletedAtUtc !== null;
  }

  /** True when this entry was projected from a confirmed Execution record. */
  get isFromExecution(): boolean {
    return this.props.source.isExecution;
  }

  /** True when this entry was manually logged by the user (Personal Mode). */
  get isFromSelf(): boolean {
    return this.props.source.isSelf;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get clientId(): string {
    return this.props.clientId;
  }

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get source(): EntrySource {
    return this.props.source;
  }

  get deliverableId(): string | null {
    return this.props.deliverableId;
  }

  get note(): SelfLogNote | null {
    return this.props.note;
  }

  get value(): number | null {
    return this.props.value;
  }

  get unit(): string | null {
    return this.props.unit;
  }

  get occurredAtUtc(): UTCDateTime {
    return this.props.occurredAtUtc;
  }

  get logicalDay(): LogicalDay {
    return this.props.logicalDay;
  }

  get timezoneUsed(): string {
    return this.props.timezoneUsed;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get correctedEntryId(): string | null {
    return this.props.correctedEntryId;
  }

  get deletedAtUtc(): UTCDateTime | null {
    return this.props.deletedAtUtc;
  }
}
