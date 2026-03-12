import { describe, it, expect } from 'vitest';
import { GoalName } from '../../../../domain/value-objects/goal-name.js';

describe('GoalName.create()', () => {
  it('accepts a valid name', () => {
    const r = GoalName.create('Lose 10kg');
    expect(r.isRight()).toBe(true);
    expect((r.value as GoalName).value).toBe('Lose 10kg');
  });

  it('trims whitespace', () => {
    const r = GoalName.create('  My Goal  ');
    expect((r.value as GoalName).value).toBe('My Goal');
  });

  it('rejects name shorter than 3 chars', () => {
    expect(GoalName.create('AB').isLeft()).toBe(true);
  });

  it('rejects empty string', () => {
    expect(GoalName.create('').isLeft()).toBe(true);
  });

  it('rejects name longer than 100 chars', () => {
    expect(GoalName.create('A'.repeat(101)).isLeft()).toBe(true);
  });

  it('accepts exactly 3 chars', () => {
    expect(GoalName.create('ABC').isRight()).toBe(true);
  });

  it('accepts exactly 100 chars', () => {
    expect(GoalName.create('A'.repeat(100)).isRight()).toBe(true);
  });
});
