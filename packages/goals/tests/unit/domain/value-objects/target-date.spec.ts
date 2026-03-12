import { describe, it, expect, vi, afterEach } from 'vitest';
import { TargetDate } from '../../../../domain/value-objects/target-date.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function futureDate(daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

describe('TargetDate.create()', () => {
  it('accepts a future date', () => {
    const r = TargetDate.create(futureDate(10));
    expect(r.isRight()).toBe(true);
  });

  it('rejects today', () => {
    const today = new Date();
    const r = TargetDate.create(today);
    expect(r.isLeft()).toBe(true);
  });

  it('rejects a past date', () => {
    const past = new Date('2020-01-01');
    const r = TargetDate.create(past);
    expect(r.isLeft()).toBe(true);
  });

  it('rejects invalid Date', () => {
    expect(TargetDate.create(new Date('invalid')).isLeft()).toBe(true);
  });

  it('rejects non-Date', () => {
    expect(TargetDate.create('2025-12-31' as never).isLeft()).toBe(true);
  });
});

describe('TargetDate.fromString()', () => {
  it('accepts valid YYYY-MM-DD string', () => {
    const r = TargetDate.fromString('2099-12-31');
    expect(r.isRight()).toBe(true);
    expect((r.value as TargetDate).value).toBe('2099-12-31');
  });

  it('rejects invalid format', () => {
    expect(TargetDate.fromString('31/12/2099').isLeft()).toBe(true);
  });

  it('rejects impossible calendar date', () => {
    expect(TargetDate.fromString('2024-02-30').isLeft()).toBe(true);
  });
});

describe('TargetDate.isFuture()', () => {
  it('returns true for future date', () => {
    const td = TargetDate.fromString('2099-12-31').value as TargetDate;
    expect(td.isFuture()).toBe(true);
  });

  it('returns false for past date', () => {
    const td = TargetDate.fromString('2020-01-01').value as TargetDate;
    expect(td.isFuture()).toBe(false);
  });
});

describe('TargetDate.daysFromNow()', () => {
  it('returns positive days for future date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    const td = TargetDate.fromString('2025-01-11').value as TargetDate;
    expect(td.daysFromNow()).toBe(10);
    vi.useRealTimers();
  });
});

describe('TargetDate.daysSince()', () => {
  it('returns number of days between start and target', () => {
    const td = TargetDate.fromString('2025-02-01').value as TargetDate;
    expect(td.daysSince('2025-01-01')).toBe(31);
  });
});
