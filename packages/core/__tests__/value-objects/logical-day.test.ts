import { describe, it, expect } from 'vitest';
import { LogicalDay } from '../../value-objects/logical-day.js';

describe('LogicalDay.create()', () => {
  describe('happy path', () => {
    it('returns Right for a valid date', () => {
      const result = LogicalDay.create('2024-03-14');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.value).toBe('2024-03-14');
    });

    it('accepts leap-year day Feb 29', () => {
      const result = LogicalDay.create('2024-02-29');
      expect(result.isRight()).toBe(true);
    });

    it('accepts last day of months with 31 days', () => {
      expect(LogicalDay.create('2024-01-31').isRight()).toBe(true);
      expect(LogicalDay.create('2024-12-31').isRight()).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('returns Left for a non-date string', () => {
      expect(LogicalDay.create('not-a-date').isLeft()).toBe(true);
    });

    it('returns Left for an empty string', () => {
      expect(LogicalDay.create('').isLeft()).toBe(true);
    });

    it('returns Left for wrong separator (slash instead of dash)', () => {
      expect(LogicalDay.create('2024/03/14').isLeft()).toBe(true);
    });

    it('returns Left for month 0', () => {
      const result = LogicalDay.create('2024-00-01');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for month 13', () => {
      const result = LogicalDay.create('2024-13-01');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for Feb 30 (impossible day)', () => {
      const result = LogicalDay.create('2024-02-30');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for Feb 29 on a non-leap year', () => {
      const result = LogicalDay.create('2023-02-29');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for day 32', () => {
      const result = LogicalDay.create('2024-01-32');
      expect(result.isLeft()).toBe(true);
    });

    it('error code is INVALID_LOGICAL_DAY', () => {
      const result = LogicalDay.create('bad');
      if (result.isLeft()) expect(result.value.code).toBe('INVALID_LOGICAL_DAY');
    });
  });

  describe('value getter and toString()', () => {
    it('value returns the ISO date string', () => {
      const result = LogicalDay.create('2024-06-15');
      if (result.isRight()) expect(result.value.value).toBe('2024-06-15');
    });

    it('toString() returns the same string as value', () => {
      const result = LogicalDay.create('2024-06-15');
      if (result.isRight()) expect(result.value.toString()).toBe('2024-06-15');
    });
  });
});

describe('LogicalDay.fromDate()', () => {
  it('converts UTC instant to local date in UTC timezone', () => {
    const utc = new Date('2024-03-15T00:30:00Z');
    const result = LogicalDay.fromDate(utc, 'UTC');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.value).toBe('2024-03-15');
  });

  it('converts UTC instant to local date in UTC-3 (Brazil)', () => {
    // 2024-03-15T02:30:00Z → in UTC-3 → 2024-03-14T23:30:00-03:00
    const utc = new Date('2024-03-15T02:30:00Z');
    const result = LogicalDay.fromDate(utc, 'America/Sao_Paulo');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.value).toBe('2024-03-14');
  });

  it('converts UTC instant near midnight', () => {
    // 2024-06-01T03:00:00Z in America/New_York (EDT = UTC-4) → 2024-05-31
    const utc = new Date('2024-06-01T03:00:00Z');
    const result = LogicalDay.fromDate(utc, 'America/New_York');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.value).toBe('2024-05-31');
  });

  it('returns Left for an unrecognised timezone identifier', () => {
    const utc = new Date('2024-03-15T00:00:00Z');
    const result = LogicalDay.fromDate(utc, 'Not/ATimezone');
    expect(result.isLeft()).toBe(true);
  });

  it('error code is INVALID_TIMEZONE for bad timezone', () => {
    const utc = new Date('2024-03-15T00:00:00Z');
    const result = LogicalDay.fromDate(utc, 'Invalid');
    if (result.isLeft()) expect(result.value.code).toBe('INVALID_TIMEZONE');
  });
});
