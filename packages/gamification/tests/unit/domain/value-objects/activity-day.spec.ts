import { describe, it, expect, vi, afterEach } from 'vitest';
import { ActivityDay } from '../../../../domain/value-objects/activity-day.js';

describe('ActivityDay', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create()', () => {
    it('normalizes a Date to UTC midnight YYYY-MM-DD', () => {
      const date = new Date('2025-03-10T15:30:00Z');
      const result = ActivityDay.create(date);
      expect(result.isRight()).toBe(true);
      expect(result.value).toHaveProperty('value', '2025-03-10');
    });

    it('returns Left for an invalid Date', () => {
      const result = ActivityDay.create(new Date('invalid'));
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('fromString()', () => {
    it('accepts a valid YYYY-MM-DD string', () => {
      const result = ActivityDay.fromString('2025-03-10');
      expect(result.isRight()).toBe(true);
      expect(result.value).toHaveProperty('value', '2025-03-10');
    });

    it('returns Left for wrong format', () => {
      expect(ActivityDay.fromString('10/03/2025').isLeft()).toBe(true);
      expect(ActivityDay.fromString('2025-3-10').isLeft()).toBe(true);
      expect(ActivityDay.fromString('').isLeft()).toBe(true);
    });

    it('returns Left for impossible calendar date', () => {
      expect(ActivityDay.fromString('2024-02-30').isLeft()).toBe(true);
      expect(ActivityDay.fromString('2024-13-01').isLeft()).toBe(true);
    });
  });

  describe('today() and yesterday()', () => {
    it('today() returns current UTC date', () => {
      vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
      expect(ActivityDay.today().value).toBe('2025-03-10');
    });

    it('yesterday() returns the day before today in UTC', () => {
      vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
      expect(ActivityDay.yesterday().value).toBe('2025-03-09');
    });
  });

  describe('isBefore() and isAfter()', () => {
    it('isBefore() is true when this < other', () => {
      const a = ActivityDay.fromString('2025-03-09').value as ActivityDay;
      const b = ActivityDay.fromString('2025-03-10').value as ActivityDay;
      expect(a.isBefore(b)).toBe(true);
      expect(b.isBefore(a)).toBe(false);
    });

    it('isAfter() is true when this > other', () => {
      const a = ActivityDay.fromString('2025-03-10').value as ActivityDay;
      const b = ActivityDay.fromString('2025-03-09').value as ActivityDay;
      expect(a.isAfter(b)).toBe(true);
      expect(b.isAfter(a)).toBe(false);
    });

    it('neither isBefore nor isAfter for equal dates', () => {
      const a = ActivityDay.fromString('2025-03-10').value as ActivityDay;
      const b = ActivityDay.fromString('2025-03-10').value as ActivityDay;
      expect(a.isBefore(b)).toBe(false);
      expect(a.isAfter(b)).toBe(false);
    });
  });

  describe('isConsecutiveTo()', () => {
    it('returns true for consecutive days', () => {
      const a = ActivityDay.fromString('2025-03-09').value as ActivityDay;
      const b = ActivityDay.fromString('2025-03-10').value as ActivityDay;
      expect(a.isConsecutiveTo(b)).toBe(true);
    });

    it('returns false for same day', () => {
      const a = ActivityDay.fromString('2025-03-10').value as ActivityDay;
      const b = ActivityDay.fromString('2025-03-10').value as ActivityDay;
      expect(a.isConsecutiveTo(b)).toBe(false);
    });

    it('returns false for gap > 1 day', () => {
      const a = ActivityDay.fromString('2025-03-08').value as ActivityDay;
      const b = ActivityDay.fromString('2025-03-10').value as ActivityDay;
      expect(a.isConsecutiveTo(b)).toBe(false);
    });

    it('returns false when other is before this', () => {
      const a = ActivityDay.fromString('2025-03-10').value as ActivityDay;
      const b = ActivityDay.fromString('2025-03-09').value as ActivityDay;
      expect(a.isConsecutiveTo(b)).toBe(false);
    });

    it('handles month boundaries correctly', () => {
      const a = ActivityDay.fromString('2025-02-28').value as ActivityDay;
      const b = ActivityDay.fromString('2025-03-01').value as ActivityDay;
      expect(a.isConsecutiveTo(b)).toBe(true);
    });

    it('handles year boundaries correctly', () => {
      const a = ActivityDay.fromString('2024-12-31').value as ActivityDay;
      const b = ActivityDay.fromString('2025-01-01').value as ActivityDay;
      expect(a.isConsecutiveTo(b)).toBe(true);
    });
  });

  describe('daysBetween()', () => {
    it('returns 0 for same day', () => {
      const a = ActivityDay.fromString('2025-03-10').value as ActivityDay;
      expect(a.daysBetween(a)).toBe(0);
    });

    it('returns 1 for consecutive days', () => {
      const a = ActivityDay.fromString('2025-03-09').value as ActivityDay;
      const b = ActivityDay.fromString('2025-03-10').value as ActivityDay;
      expect(a.daysBetween(b)).toBe(1);
      expect(b.daysBetween(a)).toBe(1);
    });

    it('returns correct days across a month boundary', () => {
      const a = ActivityDay.fromString('2025-03-01').value as ActivityDay;
      const b = ActivityDay.fromString('2025-04-01').value as ActivityDay;
      expect(a.daysBetween(b)).toBe(31);
    });
  });

  describe('toString()', () => {
    it('returns the YYYY-MM-DD string', () => {
      const day = ActivityDay.fromString('2025-03-10').value as ActivityDay;
      expect(day.toString()).toBe('2025-03-10');
    });
  });
});
