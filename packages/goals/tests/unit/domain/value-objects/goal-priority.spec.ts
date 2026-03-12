import { describe, it, expect } from 'vitest';
import { GoalPriority } from '../../../../domain/value-objects/goal-priority.js';

describe('GoalPriority.create()', () => {
  it.each(['HIGH', 'MEDIUM', 'LOW'])('accepts "%s"', (p) => {
    const r = GoalPriority.create(p);
    expect(r.isRight()).toBe(true);
    expect((r.value as GoalPriority).value).toBe(p);
  });

  it('rejects invalid priority', () => {
    expect(GoalPriority.create('CRITICAL').isLeft()).toBe(true);
  });
});
