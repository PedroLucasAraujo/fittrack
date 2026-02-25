import { AggregateRoot, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { EntitlementStatus } from '../enums/entitlement-status.js';
import { EntitlementType } from '../enums/entitlement-type.js';
import { InvalidEntitlementTransitionError } from '../errors/invalid-entitlement-transition-error.js';

export interface PlatformEntitlementProps {
  professionalProfileId: string;
  status: EntitlementStatus;
  entitlements: EntitlementType[];
  expiresAt: string | null;
  createdAtUtc: string;
}

/**
 * PlatformEntitlement aggregate root — represents the set of operational
 * capabilities granted to a professional on the FitTrack platform.
 *
 * ## Capability model
 *
 * The domain sees capabilities only (`EntitlementType[]`). Plan tiers (PRO,
 * ENTERPRISE, etc.) are a commercial concern in the Billing context. Tier-to-
 * capability mapping happens at the product/infra layer; the domain is agnostic.
 *
 * ## State machine
 *
 * ```
 * (new)      → ACTIVE      create() / grantCapabilities()
 * ACTIVE     → SUSPENDED   suspend(reason)
 * SUSPENDED  → ACTIVE      reinstate()
 * ACTIVE     → EXPIRED     expire()
 * ```
 *
 * `grantCapabilities()` resets the aggregate to ACTIVE regardless of current
 * status — it is the "admin re-grant" operation and works on any state.
 *
 * ## Invariants (ADR-0047)
 *
 * - `addCapability` / `removeCapability` / `suspend` require ACTIVE status.
 * - `reinstate` requires SUSPENDED status.
 * - `expire` requires ACTIVE status.
 * - `entitlements` array contains no duplicates.
 * - `hasCapability` returns false when status ≠ ACTIVE.
 *
 * ## Cross-aggregate references
 *
 * `professionalProfileId` is a bare string (UUIDv4) referencing the
 * ProfessionalProfile aggregate (ADR-0047 §5 — ID reference only).
 *
 * ## Domain events (ADR-0009)
 *
 * Aggregates are pure state machines. Events are constructed and published by
 * the Application layer (UseCase) after persistence — NOT by aggregate methods.
 */
export class PlatformEntitlement extends AggregateRoot<PlatformEntitlementProps> {
  private constructor(id: string, props: PlatformEntitlementProps, version: number = 0) {
    super(id, props, version);
  }

  // ── Factory ───────────────────────────────────────────────────────────────

  /**
   * Creates a new PlatformEntitlement in ACTIVE status with the provided
   * capability set. Duplicates in `entitlements` are silently de-duplicated.
   */
  static create(
    id: string,
    professionalProfileId: string,
    entitlements: EntitlementType[],
    expiresAt: string | null,
    createdAtUtc: string,
  ): PlatformEntitlement {
    return new PlatformEntitlement(
      id,
      {
        professionalProfileId,
        status: EntitlementStatus.ACTIVE,
        entitlements: [...new Set(entitlements)],
        expiresAt,
        createdAtUtc,
      },
      0,
    );
  }

  /**
   * Reconstitutes a PlatformEntitlement from persistence.
   * No validation, no events. The persisted version is passed for optimistic
   * locking (ADR-0006).
   */
  static reconstitute(
    id: string,
    props: PlatformEntitlementProps,
    version: number,
  ): PlatformEntitlement {
    return new PlatformEntitlement(id, props, version);
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get status(): EntitlementStatus {
    return this.props.status;
  }

  get entitlements(): ReadonlyArray<EntitlementType> {
    return this.props.entitlements;
  }

  get expiresAt(): string | null {
    return this.props.expiresAt;
  }

  get createdAtUtc(): string {
    return this.props.createdAtUtc;
  }

  // ── Authorization check ───────────────────────────────────────────────────

  /**
   * Returns true if the professional has this capability and the entitlement
   * is ACTIVE. Returns false for SUSPENDED or EXPIRED regardless of the
   * capabilities snapshot.
   */
  hasCapability(cap: EntitlementType): boolean {
    return this.props.status === EntitlementStatus.ACTIVE && this.props.entitlements.includes(cap);
  }

  // ── Domain methods ────────────────────────────────────────────────────────

  /**
   * Re-grants capabilities, resetting the aggregate to ACTIVE regardless of
   * its current status (ACTIVE, SUSPENDED, or EXPIRED). Duplicates in
   * `entitlements` are silently de-duplicated.
   *
   * Use this for both initial grants (on a freshly created aggregate) and
   * admin re-grants (restoring or replacing capabilities on an existing one).
   */
  grantCapabilities(entitlements: EntitlementType[], expiresAt: string | null): void {
    this.props.status = EntitlementStatus.ACTIVE;
    this.props.entitlements = [...new Set(entitlements)];
    this.props.expiresAt = expiresAt;
  }

  /**
   * Adds a single capability to the entitlement.
   *
   * Idempotent: if the capability is already present, returns Right(void)
   * without modifying state.
   *
   * Returns Left(InvalidEntitlementTransitionError) if status ≠ ACTIVE.
   */
  addCapability(cap: EntitlementType): DomainResult<void> {
    if (this.props.status !== EntitlementStatus.ACTIVE) {
      return left(
        new InvalidEntitlementTransitionError(
          `Cannot add capability ${cap}: entitlement is ${this.props.status}.`,
          { status: this.props.status, capability: cap },
        ),
      );
    }
    if (!this.props.entitlements.includes(cap)) {
      this.props.entitlements = [...this.props.entitlements, cap];
    }
    return right(undefined);
  }

  /**
   * Removes a single capability from the entitlement.
   *
   * Returns Left(InvalidEntitlementTransitionError) if:
   * - status ≠ ACTIVE
   * - capability is not present in the entitlements array
   */
  removeCapability(cap: EntitlementType): DomainResult<void> {
    if (this.props.status !== EntitlementStatus.ACTIVE) {
      return left(
        new InvalidEntitlementTransitionError(
          `Cannot remove capability ${cap}: entitlement is ${this.props.status}.`,
          { status: this.props.status, capability: cap },
        ),
      );
    }
    if (!this.props.entitlements.includes(cap)) {
      return left(
        new InvalidEntitlementTransitionError(
          `Capability ${cap} is not present in this entitlement.`,
          { capability: cap },
        ),
      );
    }
    this.props.entitlements = this.props.entitlements.filter((e) => e !== cap);
    return right(undefined);
  }

  /**
   * Transitions ACTIVE → SUSPENDED.
   *
   * The capabilities snapshot is preserved so that `reinstate()` can restore
   * the exact set without reprocessing billing or tier configuration.
   *
   * Returns Left(InvalidEntitlementTransitionError) if status ≠ ACTIVE.
   */
  suspend(_reason: string): DomainResult<void> {
    if (this.props.status !== EntitlementStatus.ACTIVE) {
      return left(
        new InvalidEntitlementTransitionError(
          `Cannot suspend entitlement: current status is ${this.props.status}.`,
          { status: this.props.status },
        ),
      );
    }
    this.props.status = EntitlementStatus.SUSPENDED;
    return right(undefined);
  }

  /**
   * Transitions SUSPENDED → ACTIVE.
   *
   * Restores the preserved capabilities snapshot.
   *
   * Returns Left(InvalidEntitlementTransitionError) if status ≠ SUSPENDED.
   */
  reinstate(): DomainResult<void> {
    if (this.props.status !== EntitlementStatus.SUSPENDED) {
      return left(
        new InvalidEntitlementTransitionError(
          `Cannot reinstate entitlement: current status is ${this.props.status}.`,
          { status: this.props.status },
        ),
      );
    }
    this.props.status = EntitlementStatus.ACTIVE;
    return right(undefined);
  }

  /**
   * Transitions ACTIVE → EXPIRED.
   *
   * Called by the `ExpireEntitlement` use case when `expiresAt` has passed.
   * The use case is responsible for validating that `expiresAt` is non-null
   * and in the past before calling this method.
   *
   * Returns Left(InvalidEntitlementTransitionError) if status ≠ ACTIVE.
   */
  expire(): DomainResult<void> {
    if (this.props.status !== EntitlementStatus.ACTIVE) {
      return left(
        new InvalidEntitlementTransitionError(
          `Cannot expire entitlement: current status is ${this.props.status}.`,
          { status: this.props.status },
        ),
      );
    }
    this.props.status = EntitlementStatus.EXPIRED;
    return right(undefined);
  }
}
