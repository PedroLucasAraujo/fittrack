import { BaseEntity, UTCDateTime, generateId } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidMilestoneNameError } from '../errors/invalid-milestone-name-error.js';
import { InvalidMilestoneTargetError } from '../errors/invalid-milestone-target-error.js';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;

export interface MilestoneProps {
  readonly name: string;
  /** Target value this milestone is reached at. */
  readonly targetValue: number;
  /** Unit of measurement (same as goal unit). */
  readonly unit: string;
  /** Order index (1, 2, 3…) within the goal's milestones. */
  readonly order: number;
  /** UTC timestamp when this milestone was reached. null = not yet reached. */
  reachedAtUtc: UTCDateTime | null;
}

/**
 * Subordinate entity within the Goal aggregate.
 * Represents an optional intermediate target on the path to the goal.
 */
export class Milestone extends BaseEntity<MilestoneProps> {
  private constructor(id: string, props: MilestoneProps) {
    super(id, props);
  }

  static create(params: {
    id?: string;
    name: string;
    targetValue: number;
    unit: string;
    order: number;
  }): DomainResult<Milestone> {
    if (typeof params.name !== 'string' || params.name.trim().length < MIN_NAME_LENGTH) {
      return left(
        new InvalidMilestoneNameError(`Must be at least ${MIN_NAME_LENGTH} characters long.`),
      );
    }
    if (params.name.trim().length > MAX_NAME_LENGTH) {
      return left(
        new InvalidMilestoneNameError(`Must be at most ${MAX_NAME_LENGTH} characters long.`),
      );
    }
    if (typeof params.targetValue !== 'number' || isNaN(params.targetValue)) {
      return left(new InvalidMilestoneTargetError('Must be a valid number.'));
    }

    const id = params.id ?? generateId();
    return right(
      new Milestone(id, {
        name: params.name.trim(),
        targetValue: params.targetValue,
        unit: params.unit,
        order: params.order,
        reachedAtUtc: null,
      }),
    );
  }

  /** Reconstitutes from persisted storage without validation. */
  static reconstitute(id: string, props: MilestoneProps): Milestone {
    return new Milestone(id, props);
  }

  markReached(): void {
    this.props.reachedAtUtc = UTCDateTime.now();
  }

  isReached(): boolean {
    return this.props.reachedAtUtc !== null;
  }

  get name(): string {
    return this.props.name;
  }

  get targetValue(): number {
    return this.props.targetValue;
  }

  get unit(): string {
    return this.props.unit;
  }

  get order(): number {
    return this.props.order;
  }

  get reachedAtUtc(): UTCDateTime | null {
    return this.props.reachedAtUtc;
  }
}
