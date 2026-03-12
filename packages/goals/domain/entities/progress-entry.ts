import { BaseEntity, generateId } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProgressSource } from '../value-objects/progress-source.js';
import { InvalidProgressSourceError } from '../errors/invalid-progress-source-error.js';
import type { ProgressSourceValue } from '../value-objects/progress-source.js';

export interface ProgressEntryProps {
  /** Recorded numeric value (same unit as the goal). */
  readonly value: number;
  /** Unit of measurement (same as goal unit). */
  readonly unit: string;
  /** Origin of this progress record. */
  readonly source: ProgressSourceValue;
  /** UTC timestamp when this entry was recorded. */
  readonly recordedAtUtc: Date;
  /** ID of the user who recorded it (if manual). No PII — ID only (ADR-0037). */
  readonly recordedBy: string | null;
  /** Optional notes (no PII). */
  readonly notes: string | null;
}

/**
 * Subordinate entity within the Goal aggregate.
 * Represents an immutable snapshot of progress at a point in time (ADR-0011).
 * ProgressEntry instances are never mutated after creation.
 */
export class ProgressEntry extends BaseEntity<ProgressEntryProps> {
  private constructor(id: string, props: ProgressEntryProps) {
    super(id, props);
  }

  static create(params: {
    id?: string;
    value: number;
    unit: string;
    source: string;
    recordedAtUtc?: Date;
    recordedBy?: string | null;
    notes?: string | null;
  }): DomainResult<ProgressEntry> {
    const sourceResult = ProgressSource.create(params.source);
    if (sourceResult.isLeft()) return left(sourceResult.value as InvalidProgressSourceError);

    const id = params.id ?? generateId();
    return right(
      new ProgressEntry(id, {
        value: params.value,
        unit: params.unit,
        source: sourceResult.value.value,
        recordedAtUtc: params.recordedAtUtc ?? new Date(),
        recordedBy: params.recordedBy ?? null,
        notes: params.notes ?? null,
      }),
    );
  }

  /** Reconstitutes from persisted storage without validation. */
  static reconstitute(id: string, props: ProgressEntryProps): ProgressEntry {
    return new ProgressEntry(id, props);
  }

  isManual(): boolean {
    return this.props.source === 'MANUAL';
  }

  isAutomatic(): boolean {
    return this.props.source !== 'MANUAL';
  }

  get value(): number {
    return this.props.value;
  }

  get unit(): string {
    return this.props.unit;
  }

  get source(): ProgressSourceValue {
    return this.props.source;
  }

  get recordedAtUtc(): Date {
    return this.props.recordedAtUtc;
  }

  get recordedBy(): string | null {
    return this.props.recordedBy;
  }

  get notes(): string | null {
    return this.props.notes;
  }
}
