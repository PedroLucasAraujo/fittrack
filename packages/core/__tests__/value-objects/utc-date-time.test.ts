import { describe, it, expect } from 'vitest';
import { UTCDateTime } from '../../value-objects/utc-date-time.js';

const VALID_ISO = '2024-03-15T02:30:00.000Z';

describe('UTCDateTime.now()', () => {
  it('returns a UTCDateTime representing a recent date', () => {
    const before = Date.now();
    const dt = UTCDateTime.now();
    const after = Date.now();
    expect(dt.value.getTime()).toBeGreaterThanOrEqual(before);
    expect(dt.value.getTime()).toBeLessThanOrEqual(after);
  });
});

describe('UTCDateTime.from()', () => {
  it('returns Right for a valid Date', () => {
    const date = new Date(VALID_ISO);
    const result = UTCDateTime.from(date);
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.toISO()).toBe(VALID_ISO);
  });

  it('returns a defensive copy (not the same Date reference)', () => {
    const original = new Date(VALID_ISO);
    const result = UTCDateTime.from(original);
    if (result.isRight()) {
      expect(result.value.value).not.toBe(original);
    }
  });

  it('returns Left for an Invalid Date', () => {
    const result = UTCDateTime.from(new Date('invalid'));
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left for a non-Date value cast as Date', () => {
    const result = UTCDateTime.from('not-a-date' as unknown as Date);
    expect(result.isLeft()).toBe(true);
  });

  it('error code is TEMPORAL_VIOLATION for invalid input', () => {
    const result = UTCDateTime.from(new Date('invalid'));
    if (result.isLeft()) expect(result.value.code).toBe('TEMPORAL_VIOLATION');
  });
});

describe('UTCDateTime.fromISO()', () => {
  it('returns Right for a valid Z-terminated ISO string', () => {
    const result = UTCDateTime.fromISO(VALID_ISO);
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.toISO()).toBe(VALID_ISO);
  });

  it('returns Left for a string without a Z suffix', () => {
    const result = UTCDateTime.fromISO('2024-03-15T02:30:00+03:00');
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left for a non-string value', () => {
    const result = UTCDateTime.fromISO(null as unknown as string);
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left for an unparseable string ending with Z', () => {
    const result = UTCDateTime.fromISO('not-a-dateZ');
    expect(result.isLeft()).toBe(true);
  });

  it('error code is TEMPORAL_VIOLATION for missing Z', () => {
    const result = UTCDateTime.fromISO('2024-03-15T02:30:00');
    if (result.isLeft()) expect(result.value.code).toBe('TEMPORAL_VIOLATION');
  });
});

describe('UTCDateTime value getter — defensive copy', () => {
  it('returns a different Date object each time', () => {
    const result = UTCDateTime.fromISO(VALID_ISO);
    if (result.isRight()) {
      const a = result.value.value;
      const b = result.value.value;
      expect(a).not.toBe(b); // different references
      expect(a.getTime()).toBe(b.getTime()); // same instant
    }
  });

  it('mutating the returned Date does not affect the internal state', () => {
    const result = UTCDateTime.fromISO(VALID_ISO);
    if (result.isRight()) {
      const copy = result.value.value;
      copy.setFullYear(2000);
      expect(result.value.toISO()).toBe(VALID_ISO); // unchanged
    }
  });
});

describe('UTCDateTime.toISO() and toString()', () => {
  it('toISO() returns the ISO string with Z suffix', () => {
    const result = UTCDateTime.fromISO(VALID_ISO);
    if (result.isRight()) {
      expect(result.value.toISO()).toBe(VALID_ISO);
      expect(result.value.toISO().endsWith('Z')).toBe(true);
    }
  });

  it('toString() delegates to toISO()', () => {
    const result = UTCDateTime.fromISO(VALID_ISO);
    if (result.isRight()) {
      expect(result.value.toString()).toBe(result.value.toISO());
    }
  });
});
