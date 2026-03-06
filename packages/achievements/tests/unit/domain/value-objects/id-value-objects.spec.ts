import { describe, it, expect } from 'vitest';
import { AchievementDefinitionId } from '../../../../domain/value-objects/achievement-definition-id.js';
import { UserAchievementProgressId } from '../../../../domain/value-objects/user-achievement-progress-id.js';

describe('AchievementDefinitionId', () => {
  it('generate() creates a non-empty unique id', () => {
    const id1 = AchievementDefinitionId.generate();
    const id2 = AchievementDefinitionId.generate();
    expect(id1.value).toBeTruthy();
    expect(id1.value).not.toBe(id2.value);
  });

  it('fromString() stores the given string', () => {
    const id = AchievementDefinitionId.fromString('my-id');
    expect(id.value).toBe('my-id');
  });

  it('toString() returns the value', () => {
    const id = AchievementDefinitionId.fromString('abc-123');
    expect(id.toString()).toBe('abc-123');
  });

  it('equals() returns true for same value', () => {
    const a = AchievementDefinitionId.fromString('same');
    const b = AchievementDefinitionId.fromString('same');
    expect(a.equals(b)).toBe(true);
  });

  it('equals() returns false for different values', () => {
    const a = AchievementDefinitionId.fromString('abc');
    const b = AchievementDefinitionId.fromString('def');
    expect(a.equals(b)).toBe(false);
  });
});

describe('UserAchievementProgressId', () => {
  it('generate() creates a non-empty unique id', () => {
    const id1 = UserAchievementProgressId.generate();
    const id2 = UserAchievementProgressId.generate();
    expect(id1.value).toBeTruthy();
    expect(id1.value).not.toBe(id2.value);
  });

  it('fromString() stores the given string', () => {
    const id = UserAchievementProgressId.fromString('progress-id');
    expect(id.value).toBe('progress-id');
  });

  it('toString() returns the value', () => {
    const id = UserAchievementProgressId.fromString('xyz-789');
    expect(id.toString()).toBe('xyz-789');
  });

  it('equals() returns true for same value', () => {
    const a = UserAchievementProgressId.fromString('same');
    const b = UserAchievementProgressId.fromString('same');
    expect(a.equals(b)).toBe(true);
  });

  it('equals() returns false for different values', () => {
    const a = UserAchievementProgressId.fromString('abc');
    const b = UserAchievementProgressId.fromString('def');
    expect(a.equals(b)).toBe(false);
  });
});
