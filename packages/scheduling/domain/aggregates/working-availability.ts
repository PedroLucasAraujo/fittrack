import { AggregateRoot, UTCDateTime, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { DayOfWeek } from '../enums/day-of-week.js';
import { TimeSlot } from '../value-objects/time-slot.js';
import { OverlappingTimeSlotError } from '../errors/overlapping-time-slot-error.js';

export interface WorkingAvailabilityProps {
  professionalProfileId: string;
  dayOfWeek: DayOfWeek;
  timezoneUsed: string;
  slots: TimeSlot[];
  createdAtUtc: UTCDateTime;
  updatedAtUtc: UTCDateTime;
}

/**
 * WorkingAvailability aggregate root — defines when a professional is available
 * for bookings on a given day of the week.
 *
 * One aggregate per (professionalProfileId, dayOfWeek). Contains a list of
 * non-overlapping TimeSlots within the day.
 *
 * Per ADR-0010 §7: availability windows use the professional's timezone.
 * Tenant isolation: `professionalProfileId` is immutable and non-null (ADR-0025).
 */
export class WorkingAvailability extends AggregateRoot<WorkingAvailabilityProps> {
  private constructor(id: string, props: WorkingAvailabilityProps, version: number = 0) {
    super(id, props, version);
  }

  static create(props: {
    id?: string;
    professionalProfileId: string;
    dayOfWeek: DayOfWeek;
    timezoneUsed: string;
    slots: TimeSlot[];
  }): DomainResult<WorkingAvailability> {
    const overlapError = WorkingAvailability.validateNoOverlaps(props.slots);
    if (overlapError) return left(overlapError);

    const id = props.id ?? generateId();
    const now = UTCDateTime.now();

    const availability = new WorkingAvailability(id, {
      professionalProfileId: props.professionalProfileId,
      dayOfWeek: props.dayOfWeek,
      timezoneUsed: props.timezoneUsed,
      slots: [...props.slots],
      createdAtUtc: now,
      updatedAtUtc: now,
    });

    return right(availability);
  }

  static reconstitute(
    id: string,
    props: WorkingAvailabilityProps,
    version: number,
  ): WorkingAvailability {
    return new WorkingAvailability(id, props, version);
  }

  // ── Commands ──────────────────────────────────────────────────────────────

  /**
   * Replaces all time slots with a new set. Validates no overlaps.
   */
  replaceSlots(newSlots: TimeSlot[]): DomainResult<void> {
    const overlapError = WorkingAvailability.validateNoOverlaps(newSlots);
    if (overlapError) return left(overlapError);

    this.props.slots = [...newSlots];
    this.props.updatedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  /**
   * Adds a single time slot. Validates no overlap with existing slots.
   */
  addSlot(slot: TimeSlot): DomainResult<void> {
    for (const existing of this.props.slots) {
      if (existing.overlapsWith(slot)) {
        return left(new OverlappingTimeSlotError(slot.startTime, slot.endTime));
      }
    }

    this.props.slots.push(slot);
    this.props.updatedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private static validateNoOverlaps(slots: TimeSlot[]): OverlappingTimeSlotError | null {
    for (let i = 0; i < slots.length; i++) {
      const slotA = slots[i];
      /* v8 ignore next -- defensive guard for noUncheckedIndexedAccess */
      if (!slotA) continue;
      for (let j = i + 1; j < slots.length; j++) {
        const slotB = slots[j];
        /* v8 ignore next -- defensive guard for noUncheckedIndexedAccess */
        if (!slotB) continue;
        if (slotA.overlapsWith(slotB)) {
          return new OverlappingTimeSlotError(slotB.startTime, slotB.endTime);
        }
      }
    }
    return null;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get dayOfWeek(): DayOfWeek {
    return this.props.dayOfWeek;
  }

  get timezoneUsed(): string {
    return this.props.timezoneUsed;
  }

  get slots(): ReadonlyArray<TimeSlot> {
    return [...this.props.slots];
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get updatedAtUtc(): UTCDateTime {
    return this.props.updatedAtUtc;
  }
}
