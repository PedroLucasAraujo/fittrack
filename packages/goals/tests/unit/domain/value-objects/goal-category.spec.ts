import { describe, it, expect } from 'vitest';
import { GoalCategory } from '../../../../domain/value-objects/goal-category.js';

describe('GoalCategory.create()', () => {
  it.each([
    'WEIGHT_LOSS',
    'MUSCLE_GAIN',
    'PERFORMANCE',
    'HEALTH',
    'HABIT',
    'CONSISTENCY',
    'NUTRITION',
  ])('accepts valid category "%s"', (cat) => {
    const result = GoalCategory.create(cat);
    expect(result.isRight()).toBe(true);
    expect((result.value as GoalCategory).value).toBe(cat);
  });

  it('rejects unknown category', () => {
    const result = GoalCategory.create('INVALID');
    expect(result.isLeft()).toBe(true);
    expect((result.value as { message: string }).message).toContain('INVALID');
  });

  it('rejects empty string', () => {
    const result = GoalCategory.create('');
    expect(result.isLeft()).toBe(true);
  });

  it('isWeightRelated() returns true for WEIGHT_LOSS and MUSCLE_GAIN', () => {
    expect((GoalCategory.create('WEIGHT_LOSS').value as GoalCategory).isWeightRelated()).toBe(true);
    expect((GoalCategory.create('MUSCLE_GAIN').value as GoalCategory).isWeightRelated()).toBe(true);
    expect((GoalCategory.create('PERFORMANCE').value as GoalCategory).isWeightRelated()).toBe(
      false,
    );
  });

  it('isPerformanceRelated() returns true only for PERFORMANCE', () => {
    expect((GoalCategory.create('PERFORMANCE').value as GoalCategory).isPerformanceRelated()).toBe(
      true,
    );
    expect((GoalCategory.create('HEALTH').value as GoalCategory).isPerformanceRelated()).toBe(
      false,
    );
  });
});
