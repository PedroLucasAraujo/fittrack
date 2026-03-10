import { AggregateRoot, UTCDateTime, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ChallengeAlreadyStartedError } from '../errors/challenge-already-started-error.js';
import { ChallengeAlreadyEndedError } from '../errors/challenge-already-ended-error.js';
import { ChallengeAlreadyCanceledError } from '../errors/challenge-already-canceled-error.js';
import { ChallengeNotEndedError } from '../errors/challenge-not-ended-error.js';
import { InvalidDurationError } from '../errors/invalid-duration-error.js';
import { ChallengeType } from '../value-objects/challenge-type.js';
import { ChallengeVisibility } from '../value-objects/challenge-visibility.js';
import { ChallengeCategory } from '../value-objects/challenge-category.js';
import { MetricType } from '../value-objects/metric-type.js';
import { GoalTarget } from '../value-objects/goal-target.js';
import { RewardPolicy } from '../value-objects/reward-policy.js';
import { ChallengeName } from '../value-objects/challenge-name.js';
import { ChallengeDescription } from '../value-objects/challenge-description.js';

export interface ChallengeProps {
  createdBy: string;
  type: string; // 'INDIVIDUAL' | 'COMMUNITY' | 'HEAD_TO_HEAD'
  visibility: string; // 'PUBLIC' | 'PROFESSIONAL' | 'PRIVATE'
  name: string;
  description: string;
  category: string; // 'WORKOUT' | 'NUTRITION' | 'STREAK' | 'VOLUME'
  goalMetricType: string; // 'WORKOUT_COUNT' | 'TOTAL_VOLUME' | 'STREAK_DAYS' | 'NUTRITION_LOG_COUNT'
  goalTargetValue: number;
  startDateUtc: Date;
  endDateUtc: Date;
  maxParticipants: number | null;
  rewardPolicy: string; // 'WINNER' | 'TOP_3' | 'TOP_10' | 'ALL_COMPLETERS'
  readonly createdAtUtc: UTCDateTime;
  updatedAtUtc: UTCDateTime;
  startedAtUtc: Date | null;
  endedAtUtc: Date | null;
  canceledAtUtc: Date | null;
}

export type ChallengeStartOutcome = { type: 'started' };
export type ChallengeEndOutcome = { type: 'ended' };
export type ChallengeCancelOutcome = { type: 'canceled'; reason: string };

/**
 * Challenge aggregate root — models a fitness challenge lifecycle.
 *
 * ## Pure state machine
 *
 * The aggregate MUST NOT dispatch domain events. The Application layer
 * constructs and publishes events after `repository.save()`.
 *
 * @see ADR-0009 — aggregate purity: no event collection, no side effects
 * @see ADR-0003 — one aggregate per transaction
 *
 * ## State transitions
 *
 * ```
 * DRAFT -> ACTIVE  (start)
 * ACTIVE -> ENDED  (end, when endDateUtc has passed)
 * DRAFT | ACTIVE -> CANCELED  (cancel)
 * ```
 *
 * ## Self-validating factory
 *
 * `Challenge.create()` validates all domain invariants (type, visibility,
 * category, metric type, goal target, reward policy, name, description, dates)
 * using the domain's Value Objects. Invalid input returns `left(DomainError)`.
 * The `maxParticipants` constraint is also enforced here based on challenge type.
 *
 * @see ADR-0010 — timestamps use `AtUtc` suffix; logicalDay is immutable once set
 */
export class Challenge extends AggregateRoot<ChallengeProps> {
  private constructor(id: string, props: ChallengeProps, version = 0) {
    super(id, props, version);
  }

  static create(props: {
    id?: string;
    createdBy: string;
    type: string;
    visibility: string;
    name: string;
    description: string;
    category: string;
    goalMetricType: string;
    goalTargetValue: number;
    startDateUtc: Date;
    endDateUtc: Date;
    maxParticipants: number | null;
    rewardPolicy: string;
    createdAtUtc: UTCDateTime;
    updatedAtUtc: UTCDateTime;
  }): DomainResult<Challenge> {
    // Validate domain invariants via Value Objects
    const typeVo = ChallengeType.create(props.type);
    if (typeVo.isLeft()) return left(typeVo.value);

    const visibilityVo = ChallengeVisibility.create(props.visibility);
    if (visibilityVo.isLeft()) return left(visibilityVo.value);

    const nameVo = ChallengeName.create(props.name);
    if (nameVo.isLeft()) return left(nameVo.value);

    const descVo = ChallengeDescription.create(props.description);
    if (descVo.isLeft()) return left(descVo.value);

    const categoryVo = ChallengeCategory.create(props.category);
    if (categoryVo.isLeft()) return left(categoryVo.value);

    const metricVo = MetricType.create(props.goalMetricType);
    if (metricVo.isLeft()) return left(metricVo.value);

    const goalTargetVo = GoalTarget.create(props.goalTargetValue);
    if (goalTargetVo.isLeft()) return left(goalTargetVo.value);

    const rewardVo = RewardPolicy.create(props.rewardPolicy);
    if (rewardVo.isLeft()) return left(rewardVo.value);

    if (props.startDateUtc >= props.endDateUtc) {
      return left(new InvalidDurationError('Start date must be before end date.'));
    }

    // Enforce maxParticipants based on type (INDIVIDUAL=1, HEAD_TO_HEAD=2, COMMUNITY=open)
    const typeConstraint = typeVo.value.getMaxParticipants();
    const maxParticipants = typeConstraint !== null ? typeConstraint : props.maxParticipants;

    const id = props.id ?? generateId();
    return right(
      new Challenge(
        id,
        {
          ...props,
          name: nameVo.value.value, // normalized (trimmed) by ChallengeName
          description: descVo.value.value, // normalized (trimmed) by ChallengeDescription
          maxParticipants,
          startedAtUtc: null,
          endedAtUtc: null,
          canceledAtUtc: null,
        },
        0,
      ),
    );
  }

  static reconstitute(id: string, props: ChallengeProps, version: number): Challenge {
    return new Challenge(id, props, version);
  }

  // ── State transitions ──────────────────────────────────────────────────────

  start(): DomainResult<ChallengeStartOutcome> {
    if (this.props.startedAtUtc !== null) {
      return left(new ChallengeAlreadyStartedError());
    }
    if (this.props.canceledAtUtc !== null) {
      return left(new ChallengeAlreadyCanceledError());
    }
    this.props.startedAtUtc = new Date();
    this.props.updatedAtUtc = UTCDateTime.now();
    return right({ type: 'started' });
  }

  end(): DomainResult<ChallengeEndOutcome> {
    if (this.props.canceledAtUtc !== null) {
      return left(new ChallengeAlreadyCanceledError());
    }
    if (!this.hasEnded()) {
      return left(new ChallengeNotEndedError());
    }
    if (this.props.endedAtUtc !== null) {
      return left(new ChallengeAlreadyEndedError());
    }
    this.props.endedAtUtc = new Date();
    this.props.updatedAtUtc = UTCDateTime.now();
    return right({ type: 'ended' });
  }

  cancel(reason: string): DomainResult<ChallengeCancelOutcome> {
    if (this.props.canceledAtUtc !== null) {
      return left(new ChallengeAlreadyCanceledError());
    }
    if (this.props.endedAtUtc !== null) {
      return left(new ChallengeAlreadyEndedError());
    }
    this.props.canceledAtUtc = new Date();
    this.props.updatedAtUtc = UTCDateTime.now();
    return right({ type: 'canceled', reason });
  }

  // ── Query helpers ──────────────────────────────────────────────────────────

  isDraft(): boolean {
    return this.props.startedAtUtc === null && this.props.canceledAtUtc === null;
  }

  isActive(): boolean {
    return (
      this.props.startedAtUtc !== null &&
      this.props.endedAtUtc === null &&
      this.props.canceledAtUtc === null &&
      Date.now() < this.props.endDateUtc.getTime()
    );
  }

  hasEnded(): boolean {
    return Date.now() >= this.props.endDateUtc.getTime() || this.props.endedAtUtc !== null;
  }

  isCanceled(): boolean {
    return this.props.canceledAtUtc !== null;
  }

  canJoin(): boolean {
    return this.isActive() && !this.isCanceled();
  }

  hasStarted(): boolean {
    return this.props.startedAtUtc !== null || Date.now() >= this.props.startDateUtc.getTime();
  }

  requiresInvite(): boolean {
    return this.props.visibility === 'PRIVATE';
  }

  isHeadToHead(): boolean {
    return this.props.type === 'HEAD_TO_HEAD';
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get createdBy(): string {
    return this.props.createdBy;
  }

  get type(): string {
    return this.props.type;
  }

  get visibility(): string {
    return this.props.visibility;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get category(): string {
    return this.props.category;
  }

  get goalMetricType(): string {
    return this.props.goalMetricType;
  }

  get goalTargetValue(): number {
    return this.props.goalTargetValue;
  }

  get startDateUtc(): Date {
    return this.props.startDateUtc;
  }

  get endDateUtc(): Date {
    return this.props.endDateUtc;
  }

  get maxParticipants(): number | null {
    return this.props.maxParticipants;
  }

  get rewardPolicy(): string {
    return this.props.rewardPolicy;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get updatedAtUtc(): UTCDateTime {
    return this.props.updatedAtUtc;
  }

  get startedAtUtc(): Date | null {
    return this.props.startedAtUtc;
  }

  get endedAtUtc(): Date | null {
    return this.props.endedAtUtc;
  }

  get canceledAtUtc(): Date | null {
    return this.props.canceledAtUtc;
  }
}
