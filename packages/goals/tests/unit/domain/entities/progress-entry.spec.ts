import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { ProgressEntry } from '../../../../domain/entities/progress-entry.js';

describe('ProgressEntry.create()', () => {
  it('creates a valid entry with MANUAL source', () => {
    const r = ProgressEntry.create({ value: 80, unit: 'kg', source: 'MANUAL' });
    expect(r.isRight()).toBe(true);
    const entry = r.value as ProgressEntry;
    expect(entry.value).toBe(80);
    expect(entry.unit).toBe('kg');
    expect(entry.source).toBe('MANUAL');
    expect(entry.isManual()).toBe(true);
    expect(entry.isAutomatic()).toBe(false);
  });

  it('creates a valid entry with ASSESSMENT source', () => {
    const r = ProgressEntry.create({ value: 78, unit: 'kg', source: 'ASSESSMENT' });
    expect(r.isRight()).toBe(true);
    const entry = r.value as ProgressEntry;
    expect(entry.isManual()).toBe(false);
    expect(entry.isAutomatic()).toBe(true);
  });

  it('creates a valid entry with METRIC source', () => {
    const r = ProgressEntry.create({ value: 100, unit: 'kg', source: 'METRIC' });
    expect(r.isRight()).toBe(true);
    const entry = r.value as ProgressEntry;
    expect(entry.isAutomatic()).toBe(true);
  });

  it('rejects invalid source', () => {
    const r = ProgressEntry.create({ value: 80, unit: 'kg', source: 'INVALID' });
    expect(r.isLeft()).toBe(true);
  });

  it('stores notes and recordedBy', () => {
    const r = ProgressEntry.create({
      value: 80,
      unit: 'kg',
      source: 'MANUAL',
      recordedBy: 'some-user-id',
      notes: 'Morning weigh-in',
    });
    const entry = r.value as ProgressEntry;
    expect(entry.recordedBy).toBe('some-user-id');
    expect(entry.notes).toBe('Morning weigh-in');
  });

  it('defaults recordedBy and notes to null', () => {
    const entry = ProgressEntry.create({ value: 80, unit: 'kg', source: 'MANUAL' })
      .value as ProgressEntry;
    expect(entry.recordedBy).toBeNull();
    expect(entry.notes).toBeNull();
  });

  it('reconstitutes from persisted data', () => {
    const now = new Date();
    const entry = ProgressEntry.reconstitute(generateId(), {
      value: 77,
      unit: 'kg',
      source: 'METRIC',
      recordedAtUtc: now,
      recordedBy: null,
      notes: null,
    });
    expect(entry.value).toBe(77);
    expect(entry.recordedAtUtc).toBe(now);
  });
});
