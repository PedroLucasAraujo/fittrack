import { describe, it, expect } from 'vitest';
import { ProgressPercentage } from '../../../../domain/value-objects/progress-percentage.js';

describe('ProgressPercentage.create()', () => {
  it('accepts 0', () => {
    const r = ProgressPercentage.create(0);
    expect(r.isRight()).toBe(true);
    expect((r.value as ProgressPercentage).value).toBe(0);
  });

  it('accepts 100', () => {
    const r = ProgressPercentage.create(100);
    expect(r.isRight()).toBe(true);
  });

  it('accepts 50.5', () => {
    const r = ProgressPercentage.create(50.5);
    expect(r.isRight()).toBe(true);
  });

  it('rejects negative values', () => {
    expect(ProgressPercentage.create(-1).isLeft()).toBe(true);
  });

  it('rejects values above 100', () => {
    expect(ProgressPercentage.create(101).isLeft()).toBe(true);
  });

  it('rejects NaN', () => {
    expect(ProgressPercentage.create(NaN).isLeft()).toBe(true);
  });
});

describe('ProgressPercentage.zero()', () => {
  it('returns 0%', () => {
    expect(ProgressPercentage.zero().value).toBe(0);
  });
});

describe('ProgressPercentage.complete()', () => {
  it('returns 100%', () => {
    expect(ProgressPercentage.complete().value).toBe(100);
  });
});

describe('ProgressPercentage.compute()', () => {
  it('calculates 50% for decreasing goal (weight loss, midway)', () => {
    // baseline=85, target=75, current=80 → (80-85)/(75-85)*100 = 50%
    const pct = ProgressPercentage.compute(85, 80, 75);
    expect(pct.value).toBe(50);
  });

  it('calculates 60% for increasing goal (muscle gain)', () => {
    // baseline=70, target=75, current=73 → (73-70)/(75-70)*100 = 60%
    const pct = ProgressPercentage.compute(70, 73, 75);
    expect(pct.value).toBe(60);
  });

  it('clamps to 0 when current is beyond baseline in wrong direction', () => {
    // baseline=85, target=75, current=90 (gained weight) → negative → clamped to 0
    const pct = ProgressPercentage.compute(85, 90, 75);
    expect(pct.value).toBe(0);
  });

  it('clamps to 100 when current exceeds target for increasing goal', () => {
    // baseline=70, target=75, current=80 → clamped to 100
    const pct = ProgressPercentage.compute(70, 80, 75);
    expect(pct.value).toBe(100);
  });

  it('returns 0 when baseline equals target', () => {
    const pct = ProgressPercentage.compute(70, 70, 70);
    expect(pct.value).toBe(0);
  });
});
