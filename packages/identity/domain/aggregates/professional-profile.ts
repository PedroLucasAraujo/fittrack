import { AggregateRoot, UTCDateTime, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { PersonName } from '../value-objects/person-name.js';
import { ProfessionalProfileStatus } from '../enums/professional-profile-status.js';
import { RiskStatus } from '../enums/risk-status.js';
import { InvalidProfileTransitionError } from '../errors/invalid-profile-transition-error.js';
import { InvalidRiskStatusTransitionError } from '../errors/invalid-risk-status-transition-error.js';

export interface ProfessionalProfileProps {
  userId: string;
  displayName: PersonName;
  status: ProfessionalProfileStatus;
  riskStatus: RiskStatus;
  createdAtUtc: UTCDateTime;
  bannedAtUtc: UTCDateTime | null;
  bannedReason: string | null;
  deactivatedAtUtc: UTCDateTime | null;
  closedAtUtc: UTCDateTime | null;
  closedReason: string | null;
  suspendedAtUtc: UTCDateTime | null;
}

/**
 * ProfessionalProfile aggregate root — represents a professional's operational
 * identity on the platform.
 *
 * Owns the lifecycle state machine (ADR-0008 §5) and the RiskStatus
 * governance (ADR-0022). Downstream contexts (Billing, Scheduling, Execution)
 * consult `riskStatus` and `status` to decide whether the professional may
 * accept new sales, create bookings, or record executions.
 *
 * ## Key invariants
 *
 * - BANNED is terminal for both status and riskStatus — no recovery (ADR-0022 §2).
 * - Closure (DEACTIVATED, CLOSED) does NOT revoke existing AccessGrants (ADR-0013 Extension).
 * - RiskStatus changes never alter historical Execution or Transaction records (ADR-0022 §6).
 * - Domain events are dispatched by the Application layer, not by aggregate methods (ADR-0009).
 *
 * ## Cross-aggregate references
 *
 * `userId` is a bare string (UUIDv4) referencing the User aggregate. Per
 * ADR-0047 §5, aggregates reference each other by ID only.
 */
export class ProfessionalProfile extends AggregateRoot<ProfessionalProfileProps> {
  private constructor(
    id: string,
    props: ProfessionalProfileProps,
    version: number = 0,
  ) {
    super(id, props, version);
  }

  /**
   * Creates a new ProfessionalProfile in PENDING_APPROVAL status with
   * NORMAL risk.
   */
  static create(props: {
    id?: string;
    userId: string;
    displayName: PersonName;
  }): DomainResult<ProfessionalProfile> {
    const id = props.id ?? generateId();
    const createdAtUtc = UTCDateTime.now();

    const profile = new ProfessionalProfile(id, {
      userId: props.userId,
      displayName: props.displayName,
      status: ProfessionalProfileStatus.PENDING_APPROVAL,
      riskStatus: RiskStatus.NORMAL,
      createdAtUtc,
      bannedAtUtc: null,
      bannedReason: null,
      deactivatedAtUtc: null,
      closedAtUtc: null,
      closedReason: null,
      suspendedAtUtc: null,
    });

    return right(profile);
  }

  /**
   * Reconstitutes from persistence. No events, no validation.
   */
  static reconstitute(
    id: string,
    props: ProfessionalProfileProps,
    version: number,
  ): ProfessionalProfile {
    return new ProfessionalProfile(id, props, version);
  }

  // ── State machine transitions (ADR-0008 §5) ─────────────────────────────

  /** PENDING_APPROVAL → ACTIVE. */
  approve(): DomainResult<void> {
    if (this.props.status !== ProfessionalProfileStatus.PENDING_APPROVAL) {
      return left(
        new InvalidProfileTransitionError(
          this.props.status,
          ProfessionalProfileStatus.ACTIVE,
        ),
      );
    }

    this.props.status = ProfessionalProfileStatus.ACTIVE;
    return right(undefined);
  }

  /** ACTIVE → SUSPENDED. Sets suspendedAtUtc. */
  suspend(): DomainResult<void> {
    if (this.props.status !== ProfessionalProfileStatus.ACTIVE) {
      return left(
        new InvalidProfileTransitionError(
          this.props.status,
          ProfessionalProfileStatus.SUSPENDED,
        ),
      );
    }

    this.props.status = ProfessionalProfileStatus.SUSPENDED;
    this.props.suspendedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /** SUSPENDED → ACTIVE. Clears suspendedAtUtc. */
  reactivate(): DomainResult<void> {
    if (this.props.status !== ProfessionalProfileStatus.SUSPENDED) {
      return left(
        new InvalidProfileTransitionError(
          this.props.status,
          ProfessionalProfileStatus.ACTIVE,
        ),
      );
    }

    this.props.status = ProfessionalProfileStatus.ACTIVE;
    this.props.suspendedAtUtc = null;
    return right(undefined);
  }

  /**
   * PENDING_APPROVAL | ACTIVE | SUSPENDED → BANNED (terminal).
   *
   * Also forces riskStatus to BANNED if not already. Sets bannedAtUtc and
   * bannedReason.
   *
   * Per ADR-0022 §4: BANNED status NEVER alters historical Execution records.
   */
  ban(reason: string): DomainResult<void> {
    const allowed = [
      ProfessionalProfileStatus.PENDING_APPROVAL,
      ProfessionalProfileStatus.ACTIVE,
      ProfessionalProfileStatus.SUSPENDED,
    ];

    if (!allowed.includes(this.props.status)) {
      return left(
        new InvalidProfileTransitionError(
          this.props.status,
          ProfessionalProfileStatus.BANNED,
        ),
      );
    }

    this.props.status = ProfessionalProfileStatus.BANNED;
    this.props.bannedAtUtc = UTCDateTime.now();
    this.props.bannedReason = reason;

    // Ensure riskStatus is also BANNED (aggregate invariant)
    if (this.props.riskStatus !== RiskStatus.BANNED) {
      this.props.riskStatus = RiskStatus.BANNED;
    }

    return right(undefined);
  }

  /**
   * ACTIVE → DEACTIVATED (terminal). Voluntary closure by the professional.
   *
   * **Does NOT revoke existing AccessGrants.** Clients retain access to
   * previously granted services (project invariant; ADR-0008).
   */
  deactivate(): DomainResult<void> {
    if (this.props.status !== ProfessionalProfileStatus.ACTIVE) {
      return left(
        new InvalidProfileTransitionError(
          this.props.status,
          ProfessionalProfileStatus.DEACTIVATED,
        ),
      );
    }

    this.props.status = ProfessionalProfileStatus.DEACTIVATED;
    this.props.deactivatedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /**
   * ACTIVE | SUSPENDED → CLOSED (terminal). Formal account closure
   * (administrative, trial expiry, or system-initiated).
   *
   * **Does NOT revoke existing AccessGrants.** Clients retain access to
   * previously granted Deliverables as personal use (ADR-0013 Extension).
   *
   * Distinct from `deactivate()` (voluntary by professional) and
   * `ban()` (punitive).
   */
  close(reason: string): DomainResult<void> {
    const allowed = [
      ProfessionalProfileStatus.ACTIVE,
      ProfessionalProfileStatus.SUSPENDED,
    ];

    if (!allowed.includes(this.props.status)) {
      return left(
        new InvalidProfileTransitionError(
          this.props.status,
          ProfessionalProfileStatus.CLOSED,
        ),
      );
    }

    this.props.status = ProfessionalProfileStatus.CLOSED;
    this.props.closedAtUtc = UTCDateTime.now();
    this.props.closedReason = reason;
    return right(undefined);
  }

  // ── RiskStatus transitions (ADR-0022 §2) ────────────────────────────────

  /** NORMAL → WATCHLIST. */
  escalateToWatchlist(): DomainResult<void> {
    if (this.props.riskStatus !== RiskStatus.NORMAL) {
      return left(
        new InvalidRiskStatusTransitionError(
          this.props.riskStatus,
          RiskStatus.WATCHLIST,
        ),
      );
    }

    this.props.riskStatus = RiskStatus.WATCHLIST;
    return right(undefined);
  }

  /** NORMAL | WATCHLIST → BANNED. Also bans the profile status. */
  escalateToBanned(reason: string): DomainResult<void> {
    if (this.props.riskStatus === RiskStatus.BANNED) {
      return left(
        new InvalidRiskStatusTransitionError(
          this.props.riskStatus,
          RiskStatus.BANNED,
        ),
      );
    }

    // ban() will set riskStatus to BANNED and emit both events
    return this.ban(reason);
  }

  /**
   * WATCHLIST → NORMAL.
   *
   * Does NOT change profile status — a SUSPENDED profile stays SUSPENDED.
   */
  resolveRisk(): DomainResult<void> {
    if (this.props.riskStatus !== RiskStatus.WATCHLIST) {
      return left(
        new InvalidRiskStatusTransitionError(
          this.props.riskStatus,
          RiskStatus.NORMAL,
        ),
      );
    }

    this.props.riskStatus = RiskStatus.NORMAL;
    return right(undefined);
  }

  // ── Query methods ────────────────────────────────────────────────────────

  /**
   * True when the profile is ACTIVE and risk is not BANNED.
   * Used by downstream contexts to check if the professional can operate.
   */
  isOperational(): boolean {
    return (
      this.props.status === ProfessionalProfileStatus.ACTIVE &&
      this.props.riskStatus !== RiskStatus.BANNED
    );
  }

  /**
   * True only when ACTIVE with NORMAL risk — the strictest operational check.
   * Influences whether new ServicePlans can be sold (ADR-0022 §3).
   */
  canAcceptNewSales(): boolean {
    return (
      this.props.status === ProfessionalProfileStatus.ACTIVE &&
      this.props.riskStatus === RiskStatus.NORMAL
    );
  }

  /** Whether the profile is permanently banned. */
  isBanned(): boolean {
    return this.props.status === ProfessionalProfileStatus.BANNED;
  }

  /** Whether the profile is formally closed (ADR-0013 Extension). */
  isClosed(): boolean {
    return this.props.status === ProfessionalProfileStatus.CLOSED;
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get userId(): string {
    return this.props.userId;
  }

  get displayName(): PersonName {
    return this.props.displayName;
  }

  get status(): ProfessionalProfileStatus {
    return this.props.status;
  }

  get riskStatus(): RiskStatus {
    return this.props.riskStatus;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get bannedAtUtc(): UTCDateTime | null {
    return this.props.bannedAtUtc;
  }

  get bannedReason(): string | null {
    return this.props.bannedReason;
  }

  get deactivatedAtUtc(): UTCDateTime | null {
    return this.props.deactivatedAtUtc;
  }

  get closedAtUtc(): UTCDateTime | null {
    return this.props.closedAtUtc;
  }

  get closedReason(): string | null {
    return this.props.closedReason;
  }

  get suspendedAtUtc(): UTCDateTime | null {
    return this.props.suspendedAtUtc;
  }
}
