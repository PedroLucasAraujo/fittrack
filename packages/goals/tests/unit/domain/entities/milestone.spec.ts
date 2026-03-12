import { describe, it, expect } from 'vitest';
import { UTCDateTime } from '@fittrack/core';
import { Milestone } from '../../../../domain/entities/milestone.js';

describe('Milestone.create()', () => {
  it('creates a valid milestone', () => {
    const r = Milestone.create({ name: 'First milestone', targetValue: 80, unit: 'kg', order: 1 });
    expect(r.isRight()).toBe(true);
    const m = r.value as Milestone;
    expect(m.name).toBe('First milestone');
    expect(m.targetValue).toBe(80);
    expect(m.unit).toBe('kg');
    expect(m.order).toBe(1);
    expect(m.isReached()).toBe(false);
    expect(m.reachedAtUtc).toBeNull();
  });

  it('rejects name shorter than 2 chars', () => {
    expect(Milestone.create({ name: 'A', targetValue: 80, unit: 'kg', order: 1 }).isLeft()).toBe(
      true,
    );
  });

  it('rejects name longer than 80 chars', () => {
    expect(
      Milestone.create({ name: 'A'.repeat(81), targetValue: 80, unit: 'kg', order: 1 }).isLeft(),
    ).toBe(true);
  });

  it('rejects NaN targetValue', () => {
    expect(
      Milestone.create({ name: 'Milestone', targetValue: NaN, unit: 'kg', order: 1 }).isLeft(),
    ).toBe(true);
  });

  it('trims milestone name', () => {
    const m = Milestone.create({ name: '  Step 1  ', targetValue: 80, unit: 'kg', order: 1 })
      .value as Milestone;
    expect(m.name).toBe('Step 1');
  });
});

describe('Milestone.markReached()', () => {
  it('sets reachedAtUtc and isReached() returns true', () => {
    const m = Milestone.create({ name: 'Step 1', targetValue: 80, unit: 'kg', order: 1 })
      .value as Milestone;
    expect(m.isReached()).toBe(false);
    m.markReached();
    expect(m.isReached()).toBe(true);
    expect(m.reachedAtUtc).toBeInstanceOf(UTCDateTime);
  });
});
