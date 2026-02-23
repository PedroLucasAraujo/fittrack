import { AggregateRoot, UTCDateTime, LogicalDay, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ExecutionCorrection } from '../entities/execution-correction.js';
import { CorrectionReasonRequiredError } from '../errors/correction-reason-required-error.js';

export interface ExecutionProps {
  /**
   * Owning professional — tenant isolation key (ADR-0025). Immutable.
   * Cross-aggregate reference: ID only (ADR-0047).
   */
  professionalProfileId: string;

  /**
   * Client who received the service delivery.
   * Cross-aggregate reference: ID only (ADR-0047). Immutable.
   */
  clientId: string;

  /**
   * AccessGrant that authorized this delivery (ADR-0046 §3).
   * All 5 validity checks performed by Application layer before Execution creation.
   * Cross-aggregate reference: ID only (ADR-0047). Immutable.
   */
  accessGrantId: string;

  /**
   * References the ACTIVE Deliverable whose content snapshot was delivered
   * (ADR-0005 §8, ADR-0011). The Deliverable IS the immutable content snapshot.
   * Cross-aggregate reference: ID only (ADR-0047). Immutable.
   */
  deliverableId: string;

  /**
   * UTC instant when the service was actually delivered (Q4 — caller-supplied).
   * Represents the real-world delivery time, not the recording time.
   * `logicalDay` is derived from this value at creation (ADR-0010 §2). Immutable.
   */
  occurredAtUtc: UTCDateTime;

  /**
   * Calendar date of delivery in the client's IANA timezone (ADR-0010).
   * Computed once from `occurredAtUtc` + `timezoneUsed` at creation.
   * Never recomputed (ADR-0010 §5). Immutable.
   */
  logicalDay: LogicalDay;

  /**
   * Client's IANA timezone used to compute `logicalDay` (ADR-0010, Q2 — caller-supplied).
   * Immutable — set at creation time and never changed.
   */
  timezoneUsed: string;

  /** UTC instant when this record was created in the system. System-assigned. Immutable. */
  createdAtUtc: UTCDateTime;

  /**
   * Ordered correction history for this Execution (ADR-0005 §4).
   *
   * Append-only: entries are added via `Execution.recordCorrection()`.
   * Corrections explain why the recorded delivery was erroneous without
   * altering the original Execution fields.
   * Each correction triggers metric recomputation via `ExecutionCorrectionRecorded`
   * event dispatched by the Application layer post-commit (ADR-0009 §1, ADR-0043).
   */
  corrections: ExecutionCorrection[];
}

/**
 * Execution aggregate root — an immutable historical record of professional
 * service delivery (ADR-0005 — CANONICAL, ADR-0001 §2).
 *
 * ## Immutability (ADR-0005 — CANONICAL)
 *
 * Executions are permanently immutable after creation. They are NEVER updated,
 * deleted, or retroactively altered under any circumstance, including:
 * - Chargeback or refund (ADR-0020)
 * - AccessGrant revocation (ADR-0046 §6)
 * - Professional account closure or banning (ADR-0022 §4)
 * - LGPD erasure requests (ADR-0037 §5 — structure retained, PII anonymized)
 *
 * ## No status field
 *
 * Execution has no lifecycle state machine. The existence of an Execution record
 * IS the confirmation of delivery. Errors in recorded deliveries are handled
 * exclusively via `ExecutionCorrection` compensating records (ADR-0005 §4),
 * not through status transitions.
 *
 * ## Creation prerequisites (ADR-0017 §5, ADR-0046 §3)
 *
 * The Application layer (CreateExecution use case) enforces all prerequisites
 * before calling `Execution.create()`:
 * - All 5 ADR-0046 §3 AccessGrant validity checks pass.
 * - Deliverable status is ACTIVE (ADR-0044 §2, ADR-0029 cross-context check).
 * The domain factory trusts these pre-conditions have been enforced.
 *
 * ## Temporal fields (ADR-0010 — CANONICAL)
 *
 * Three required temporal fields:
 * - `occurredAtUtc`: UTC instant of actual delivery (caller-supplied).
 * - `logicalDay`: calendar date in client's timezone (derived at creation, immutable).
 * - `timezoneUsed`: client's IANA timezone (caller-supplied).
 *
 * ## Cross-aggregate references (ADR-0047)
 *
 * Execution references AccessGrant and Deliverable by string ID only.
 * It never holds live object references to other aggregates.
 *
 * ## Source of truth for metrics (ADR-0014)
 *
 * Metrics are always derived from Execution records, never primary data.
 * Safe recomputation is possible because the source is permanently intact.
 */
export class Execution extends AggregateRoot<ExecutionProps> {
  private constructor(id: string, props: ExecutionProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new Execution record.
   *
   * All temporal value objects (`occurredAtUtc`, `logicalDay`) must be
   * pre-constructed and validated by the Application layer.
   * All cross-context pre-conditions (AccessGrant validity, Deliverable ACTIVE)
   * must be confirmed before calling this factory.
   *
   * The corrections list is initialized empty.
   * The factory always returns `Right<Execution>` when called with valid domain objects.
   */
  static create(props: {
    id?: string;
    professionalProfileId: string;
    clientId: string;
    accessGrantId: string;
    deliverableId: string;
    occurredAtUtc: UTCDateTime;
    logicalDay: LogicalDay;
    timezoneUsed: string;
    createdAtUtc: UTCDateTime;
  }): DomainResult<Execution> {
    const id = props.id ?? generateId();
    const execution = new Execution(
      id,
      {
        professionalProfileId: props.professionalProfileId,
        clientId: props.clientId,
        accessGrantId: props.accessGrantId,
        deliverableId: props.deliverableId,
        occurredAtUtc: props.occurredAtUtc,
        logicalDay: props.logicalDay,
        timezoneUsed: props.timezoneUsed,
        createdAtUtc: props.createdAtUtc,
        corrections: [],
      },
      0,
    );
    return right(execution);
  }

  static reconstitute(id: string, props: ExecutionProps, version: number): Execution {
    return new Execution(id, props, version);
  }

  // ── Correction operations (ADR-0005 §4) ──────────────────────────────────────

  /**
   * Appends an `ExecutionCorrection` to this Execution's history.
   *
   * Corrections never modify the original Execution fields — they are
   * compensating records that explain why the delivery record was erroneous.
   *
   * The Application layer MUST dispatch `ExecutionCorrectionRecorded` event
   * post-commit (ADR-0009 §1) to trigger metric recomputation (ADR-0043).
   *
   * @param reason     Non-empty human-readable explanation. Required.
   * @param correctedBy UUID of the professional recording the correction.
   */
  recordCorrection(reason: string, correctedBy: string): DomainResult<ExecutionCorrection> {
    if (!reason || reason.trim().length === 0) {
      return left(new CorrectionReasonRequiredError());
    }

    const correction = ExecutionCorrection.create({
      reason: reason.trim(),
      correctedAtUtc: UTCDateTime.now(),
      correctedBy,
    });

    this.props.corrections.push(correction);
    return right(correction);
  }

  // ── Query helpers ─────────────────────────────────────────────────────────────

  /** True when at least one correction has been recorded on this Execution. */
  get hasCorrections(): boolean {
    return this.props.corrections.length > 0;
  }

  // ── Getters ──────────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get accessGrantId(): string {
    return this.props.accessGrantId;
  }

  get deliverableId(): string {
    return this.props.deliverableId;
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

  /** Returns a shallow copy — callers must not mutate the returned array. */
  get corrections(): ReadonlyArray<ExecutionCorrection> {
    return [...this.props.corrections];
  }
}
