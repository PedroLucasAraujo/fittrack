import { describe, it, expect } from 'vitest';
import { GoalMetric } from '../../../../domain/value-objects/goal-metric.js';

describe('GoalMetric.create()', () => {
  it.each([
    'WEIGHT',
    'BODY_FAT',
    'STRENGTH',
    'ENDURANCE',
    'STREAK_DAYS',
    'WEEKLY_VOLUME',
    'DAILY_PROTEIN',
    'DAILY_WATER',
  ])('accepts valid metric "%s"', (metric) => {
    const result = GoalMetric.create(metric);
    expect(result.isRight()).toBe(true);
  });

  it('rejects invalid metric', () => {
    const result = GoalMetric.create('INVALID_METRIC');
    expect(result.isLeft()).toBe(true);
    expect((result.value as { message: string }).message).toContain('INVALID_METRIC');
  });

  it('getDefaultUnit() returns correct unit for each metric', () => {
    const cases: Array<[string, string]> = [
      ['WEIGHT', 'kg'],
      ['BODY_FAT', '%'],
      ['STRENGTH', 'kg'],
      ['ENDURANCE', 'min'],
      ['STREAK_DAYS', 'days'],
      ['WEEKLY_VOLUME', 'kg'],
      ['DAILY_PROTEIN', 'g'],
      ['DAILY_WATER', 'L'],
    ];
    for (const [metric, unit] of cases) {
      const vo = GoalMetric.create(metric).value as GoalMetric;
      expect(vo.getDefaultUnit()).toBe(unit);
    }
  });

  it('isTypicallyDecreasing() returns true for WEIGHT and BODY_FAT only', () => {
    expect((GoalMetric.create('WEIGHT').value as GoalMetric).isTypicallyDecreasing()).toBe(true);
    expect((GoalMetric.create('BODY_FAT').value as GoalMetric).isTypicallyDecreasing()).toBe(true);
    expect((GoalMetric.create('STRENGTH').value as GoalMetric).isTypicallyDecreasing()).toBe(false);
    expect((GoalMetric.create('STREAK_DAYS').value as GoalMetric).isTypicallyDecreasing()).toBe(
      false,
    );
  });
});
