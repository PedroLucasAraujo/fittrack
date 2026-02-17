import { AggregateRoot, UTCDateTime, Money, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ServicePlanStatus } from '../enums/service-plan-status.js';
import { PlanType } from '../enums/plan-type.js';
import { InvalidServicePlanError } from '../errors/invalid-service-plan-error.js';
import { InvalidServicePlanTransitionError } from '../errors/invalid-service-plan-transition-error.js';

export interface ServicePlanProps {
  professionalProfileId: string;
  name: string;
  description: string;
  price: Money;
  durationDays: number;
  sessionAllotment: number | null;
  type: PlanType;
  status: ServicePlanStatus;
  createdAtUtc: UTCDateTime;
  activatedAtUtc: UTCDateTime | null;
  archivedAtUtc: UTCDateTime | null;
}

/**
 * ServicePlan aggregate root — defines a purchasable service offering
 * created by a professional (ADR-0015 §1).
 *
 * ## Key invariants
 *
 * - Created in DRAFT status; not purchasable until activated.
 * - Only ACTIVE plans are purchasable (ADR-0015 §1).
 * - Pausing or archiving does not revoke existing AccessGrants (ADR-0015 §2–3).
 * - Domain events are dispatched by the Application layer (ADR-0009).
 *
 * ## Cross-aggregate references
 *
 * `professionalProfileId` is a bare string (UUIDv4) referencing the
 * ProfessionalProfile aggregate in the Identity context (ADR-0047 §5).
 */
export class ServicePlan extends AggregateRoot<ServicePlanProps> {
  private constructor(id: string, props: ServicePlanProps, version: number = 0) {
    super(id, props, version);
  }

  static create(props: {
    id?: string;
    professionalProfileId: string;
    name: string;
    description: string;
    price: Money;
    durationDays: number;
    sessionAllotment?: number | null;
    type: PlanType;
  }): DomainResult<ServicePlan> {
    const trimmedName = props.name.trim();

    if (trimmedName.length < 1 || trimmedName.length > 120) {
      return left(
        new InvalidServicePlanError(
          `Name must be between 1 and 120 characters. Received length: ${trimmedName.length}`,
        ),
      );
    }

    if (props.price.amount <= 0) {
      return left(
        new InvalidServicePlanError(
          `Price must be greater than zero. Received: ${props.price.amount}`,
        ),
      );
    }

    if (!Number.isInteger(props.durationDays) || props.durationDays <= 0) {
      return left(
        new InvalidServicePlanError(
          `Duration must be a positive integer. Received: ${props.durationDays}`,
        ),
      );
    }

    if (
      props.sessionAllotment !== undefined &&
      props.sessionAllotment !== null &&
      (!Number.isInteger(props.sessionAllotment) || props.sessionAllotment <= 0)
    ) {
      return left(
        new InvalidServicePlanError(
          `Session allotment must be a positive integer or null. Received: ${props.sessionAllotment}`,
        ),
      );
    }

    const id = props.id ?? generateId();

    const plan = new ServicePlan(id, {
      professionalProfileId: props.professionalProfileId,
      name: trimmedName,
      description: props.description.trim(),
      price: props.price,
      durationDays: props.durationDays,
      sessionAllotment: props.sessionAllotment ?? null,
      type: props.type,
      status: ServicePlanStatus.DRAFT,
      createdAtUtc: UTCDateTime.now(),
      activatedAtUtc: null,
      archivedAtUtc: null,
    });

    return right(plan);
  }

  static reconstitute(id: string, props: ServicePlanProps, version: number): ServicePlan {
    return new ServicePlan(id, props, version);
  }

  // ── State machine transitions (ADR-0015 §1) ─────────────────────────────

  /** DRAFT → ACTIVE. Sets activatedAtUtc. */
  activate(): DomainResult<void> {
    if (this.props.status !== ServicePlanStatus.DRAFT) {
      return left(
        new InvalidServicePlanTransitionError(this.props.status, ServicePlanStatus.ACTIVE),
      );
    }

    this.props.status = ServicePlanStatus.ACTIVE;
    this.props.activatedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /** ACTIVE → PAUSED. Does not revoke existing AccessGrants. */
  pause(): DomainResult<void> {
    if (this.props.status !== ServicePlanStatus.ACTIVE) {
      return left(
        new InvalidServicePlanTransitionError(this.props.status, ServicePlanStatus.PAUSED),
      );
    }

    this.props.status = ServicePlanStatus.PAUSED;
    return right(undefined);
  }

  /** PAUSED → ACTIVE. */
  resume(): DomainResult<void> {
    if (this.props.status !== ServicePlanStatus.PAUSED) {
      return left(
        new InvalidServicePlanTransitionError(this.props.status, ServicePlanStatus.ACTIVE),
      );
    }

    this.props.status = ServicePlanStatus.ACTIVE;
    return right(undefined);
  }

  /** ACTIVE | PAUSED → ARCHIVED. Does not revoke existing AccessGrants. */
  archive(): DomainResult<void> {
    const allowed = [ServicePlanStatus.ACTIVE, ServicePlanStatus.PAUSED];

    if (!allowed.includes(this.props.status)) {
      return left(
        new InvalidServicePlanTransitionError(this.props.status, ServicePlanStatus.ARCHIVED),
      );
    }

    this.props.status = ServicePlanStatus.ARCHIVED;
    this.props.archivedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  // ── Query methods ────────────────────────────────────────────────────────

  /** True only when ACTIVE — the only purchasable state (ADR-0015 §1). */
  isPurchasable(): boolean {
    return this.props.status === ServicePlanStatus.ACTIVE;
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get price(): Money {
    return this.props.price;
  }

  get durationDays(): number {
    return this.props.durationDays;
  }

  get sessionAllotment(): number | null {
    return this.props.sessionAllotment;
  }

  get type(): PlanType {
    return this.props.type;
  }

  get status(): ServicePlanStatus {
    return this.props.status;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get activatedAtUtc(): UTCDateTime | null {
    return this.props.activatedAtUtc;
  }

  get archivedAtUtc(): UTCDateTime | null {
    return this.props.archivedAtUtc;
  }
}
