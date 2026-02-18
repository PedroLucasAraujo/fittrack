import { describe, it, expect } from 'vitest';
import { DurationMinutes } from '../../../domain/value-objects/duration-minutes.js';
import { SessionTitle } from '../../../domain/value-objects/session-title.js';
import { TimeSlot } from '../../../domain/value-objects/time-slot.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';

describe('DurationMinutes', () => {
  it('creates valid duration', () => {
    const result = DurationMinutes.create(60);
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.value).toBe(60);
      expect(result.value.toString()).toBe('60min');
    }
  });

  it('creates with minimum value (1)', () => {
    const result = DurationMinutes.create(1);
    expect(result.isRight()).toBe(true);
  });

  it('creates with maximum value (480)', () => {
    const result = DurationMinutes.create(480);
    expect(result.isRight()).toBe(true);
  });

  it('rejects zero', () => {
    const result = DurationMinutes.create(0);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_DURATION);
    }
  });

  it('rejects negative', () => {
    expect(DurationMinutes.create(-10).isLeft()).toBe(true);
  });

  it('rejects above 480', () => {
    expect(DurationMinutes.create(481).isLeft()).toBe(true);
  });

  it('rejects non-integer', () => {
    expect(DurationMinutes.create(30.5).isLeft()).toBe(true);
  });
});

describe('SessionTitle', () => {
  it('creates valid title', () => {
    const result = SessionTitle.create('Personal Training');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.value).toBe('Personal Training');
      expect(result.value.toString()).toBe('Personal Training');
    }
  });

  it('trims whitespace', () => {
    const result = SessionTitle.create('  Yoga  ');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.value).toBe('Yoga');
    }
  });

  it('rejects empty string', () => {
    const result = SessionTitle.create('');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_SESSION_TITLE);
    }
  });

  it('rejects whitespace-only string', () => {
    expect(SessionTitle.create('   ').isLeft()).toBe(true);
  });

  it('rejects title over 120 characters', () => {
    const long = 'A'.repeat(121);
    expect(SessionTitle.create(long).isLeft()).toBe(true);
  });

  it('accepts title of exactly 120 characters', () => {
    const exact = 'A'.repeat(120);
    expect(SessionTitle.create(exact).isRight()).toBe(true);
  });
});

describe('TimeSlot', () => {
  it('creates valid time slot', () => {
    const result = TimeSlot.create('08:00', '12:00');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.startTime).toBe('08:00');
      expect(result.value.endTime).toBe('12:00');
      expect(result.value.toString()).toBe('08:00–12:00');
    }
  });

  it('rejects invalid start time format', () => {
    const result = TimeSlot.create('8:00', '12:00');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_TIME_SLOT);
    }
  });

  it('rejects invalid end time format', () => {
    const result = TimeSlot.create('08:00', '25:00');
    expect(result.isLeft()).toBe(true);
  });

  it('rejects start >= end', () => {
    const result = TimeSlot.create('12:00', '08:00');
    expect(result.isLeft()).toBe(true);
  });

  it('rejects start == end', () => {
    const result = TimeSlot.create('10:00', '10:00');
    expect(result.isLeft()).toBe(true);
  });

  describe('overlapsWith()', () => {
    it('detects overlapping slots', () => {
      const slot1 = TimeSlot.create('08:00', '12:00').value as TimeSlot;
      const slot2 = TimeSlot.create('11:00', '15:00').value as TimeSlot;
      expect(slot1.overlapsWith(slot2)).toBe(true);
    });

    it('detects contained slots', () => {
      const outer = TimeSlot.create('08:00', '18:00').value as TimeSlot;
      const inner = TimeSlot.create('10:00', '14:00').value as TimeSlot;
      expect(outer.overlapsWith(inner)).toBe(true);
    });

    it('returns false for adjacent slots', () => {
      const slot1 = TimeSlot.create('08:00', '12:00').value as TimeSlot;
      const slot2 = TimeSlot.create('12:00', '16:00').value as TimeSlot;
      expect(slot1.overlapsWith(slot2)).toBe(false);
    });

    it('returns false for non-overlapping slots', () => {
      const slot1 = TimeSlot.create('08:00', '10:00').value as TimeSlot;
      const slot2 = TimeSlot.create('14:00', '16:00').value as TimeSlot;
      expect(slot1.overlapsWith(slot2)).toBe(false);
    });
  });
});
