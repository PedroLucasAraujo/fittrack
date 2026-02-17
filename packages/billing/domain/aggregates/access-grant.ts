import { AggregateRoot, UTCDateTime, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AccessGrantStatus } from '../enums/access-grant-status.js';
import { InvalidAccessGrantTransitionError } from '../errors/invalid-access-grant-transition-error.js';

export interface AccessGrantProps {
  clientId: string;
  professionalProfileId: string;
  servicePlanId: string;
  transactionId: string;
  status: AccessGrantStatus;
  sessionAllotment: number | null;
  sessionsConsumed: number;
  validFrom: UTCDateTime;
  validUntil: UTCDateTime | null;
  createdAtUtc: UTCDateTime;
  suspendedAtUtc: UTCDateTime | null;
  revokedAtUtc: UTCDateTime | null;
  revokedReason: string | null;
}

/**
 * AccessGrant aggregate root — the authorization token that connects a
 * confirmed payment to the right to create Execution records (ADR-0046).
 *
 * ## Key invariants
 *
 * - Created exclusively by the Billing context after payment confirmation
 *   (ADR-0017 §1, ADR-0046 §Constraints).
 * - Requires a confirmed Transaction reference (subscription-first; ADR-0017).
 * - EXPIRED and REVOKED are terminal states — no transitions out (ADR-0046 §2).
 * - Revocation does not delete or modify historical Execution records (ADR-0005).
 * - Immutable after creation: id, clientId, professionalProfileId, servicePlanId,
 *   transactionId, sessionAllotment, validFrom, validUntil, createdAtUtc (ADR-0046 §5).
 * - Domain events are dispatched by the Application layer (ADR-0009).
 *
 * ## Cross-aggregate references
 *
 * All foreign keys are bare strings (UUIDv4) per ADR-0047 §5.
 */
export class AccessGrant extends AggregateRoot<AccessGrantProps> {
  private constructor(
    id: string,
    props: AccessGrantProps,
    version: number = 0,
  ) {
    super(id, props, version);
  }

  /**
   * Creates a new AccessGrant in ACTIVE status.
   *
   * Per ADR-0017: AccessGrant is created only after a Transaction is CONFIRMED.
   * The calling use case is responsible for verifying that the Transaction
   * is in CONFIRMED status before calling this factory.
   */
  static create(props: {
    id?: string;
    clientId: string;
    professionalProfileId: string;
    servicePlanId: string;
    transactionId: string;
    sessionAllotment: number | null;
    validFrom: UTCDateTime;
    validUntil: UTCDateTime | null;
  }): DomainResult<AccessGrant> {
    const id = props.id ?? generateId();

    const grant = new AccessGrant(id, {
      clientId: props.clientId,
      professionalProfileId: props.professionalProfileId,
      servicePlanId: props.servicePlanId,
      transactionId: props.transactionId,
      status: AccessGrantStatus.ACTIVE,
      sessionAllotment: props.sessionAllotment,
      sessionsConsumed: 0,
      validFrom: props.validFrom,
      validUntil: props.validUntil,
      createdAtUtc: UTCDateTime.now(),
      suspendedAtUtc: null,
      revokedAtUtc: null,
      revokedReason: null,
    });

    return right(grant);
  }

  static reconstitute(
    id: string,
    props: AccessGrantProps,
    version: number,
  ): AccessGrant {
    return new AccessGrant(id, props, version);
  }

  // ── Status transitions (ADR-0046 §2) ────────────────────────────────────

  /** ACTIVE → SUSPENDED. Triggered by professional's RiskStatus → WATCHLIST. */
  suspend(): DomainResult<void> {
    if (this.props.status !== AccessGrantStatus.ACTIVE) {
      return left(
        new InvalidAccessGrantTransitionError(
          this.props.status,
          AccessGrantStatus.SUSPENDED,
        ),
      );
    }

    this.props.status = AccessGrantStatus.SUSPENDED;
    this.props.suspendedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /** SUSPENDED → ACTIVE. Triggered by professional's RiskStatus → NORMAL. */
  reinstate(): DomainResult<void> {
    if (this.props.status !== AccessGrantStatus.SUSPENDED) {
      return left(
        new InvalidAccessGrantTransitionError(
          this.props.status,
          AccessGrantStatus.ACTIVE,
        ),
      );
    }

    this.props.status = AccessGrantStatus.ACTIVE;
    this.props.suspendedAtUtc = null;
    return right(undefined);
  }

  /**
   * ACTIVE | SUSPENDED → REVOKED (terminal).
   *
   * Triggered by ChargebackRegistered, PaymentRefunded, or admin action.
   * Per ADR-0020: revocation applies to future access only; past Execution
   * records are permanently retained.
   */
  revoke(reason: string): DomainResult<void> {
    const allowed = [AccessGrantStatus.ACTIVE, AccessGrantStatus.SUSPENDED];

    if (!allowed.includes(this.props.status)) {
      return left(
        new InvalidAccessGrantTransitionError(
          this.props.status,
          AccessGrantStatus.REVOKED,
        ),
      );
    }

    this.props.status = AccessGrantStatus.REVOKED;
    this.props.revokedAtUtc = UTCDateTime.now();
    this.props.revokedReason = reason;
    return right(undefined);
  }

  /** ACTIVE → EXPIRED (terminal). Time-based or session exhaustion. */
  expire(): DomainResult<void> {
    if (this.props.status !== AccessGrantStatus.ACTIVE) {
      return left(
        new InvalidAccessGrantTransitionError(
          this.props.status,
          AccessGrantStatus.EXPIRED,
        ),
      );
    }

    this.props.status = AccessGrantStatus.EXPIRED;
    return right(undefined);
  }

  // ── Query methods ────────────────────────────────────────────────────────

  /** True only when ACTIVE — the only state that permits Execution creation. */
  isValid(): boolean {
    return this.props.status === AccessGrantStatus.ACTIVE;
  }

  /**
   * True when sessions remain (or allotment is unlimited).
   * Used as part of the 5-point AccessGrant validity check (ADR-0046 §3).
   */
  hasSessionsRemaining(): boolean {
    if (this.props.sessionAllotment === null) return true;
    return this.props.sessionsConsumed < this.props.sessionAllotment;
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get clientId(): string {
    return this.props.clientId;
  }

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get servicePlanId(): string {
    return this.props.servicePlanId;
  }

  get transactionId(): string {
    return this.props.transactionId;
  }

  get status(): AccessGrantStatus {
    return this.props.status;
  }

  get sessionAllotment(): number | null {
    return this.props.sessionAllotment;
  }

  get sessionsConsumed(): number {
    return this.props.sessionsConsumed;
  }

  get validFrom(): UTCDateTime {
    return this.props.validFrom;
  }

  get validUntil(): UTCDateTime | null {
    return this.props.validUntil;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get suspendedAtUtc(): UTCDateTime | null {
    return this.props.suspendedAtUtc;
  }

  get revokedAtUtc(): UTCDateTime | null {
    return this.props.revokedAtUtc;
  }

  get revokedReason(): string | null {
    return this.props.revokedReason;
  }
}
