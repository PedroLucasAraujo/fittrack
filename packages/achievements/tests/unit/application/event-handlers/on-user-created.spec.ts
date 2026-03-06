import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { OnUserCreated } from '../../../../application/event-handlers/on-user-created.js';
import { InMemoryAchievementDefinitionRepository } from '../../../repositories/in-memory-achievement-definition-repository.js';
import { InMemoryUserAchievementProgressRepository } from '../../../repositories/in-memory-user-achievement-progress-repository.js';
import { makeAchievementDefinition } from '../../../helpers/make-achievement-definition.js';

describe('OnUserCreated', () => {
  let definitionRepo: InMemoryAchievementDefinitionRepository;
  let progressRepo: InMemoryUserAchievementProgressRepository;

  beforeEach(() => {
    definitionRepo = new InMemoryAchievementDefinitionRepository();
    progressRepo = new InMemoryUserAchievementProgressRepository();
  });

  it('creates zero-progress records for all active definitions', async () => {
    const d1 = makeAchievementDefinition({ code: 'FIRST_WORKOUT', active: true });
    const d2 = makeAchievementDefinition({ code: 'TEN_WORKOUTS', active: true });
    await definitionRepo.save(d1);
    await definitionRepo.save(d2);

    const handler = new OnUserCreated(definitionRepo, progressRepo);
    const userId = generateId();
    await handler.handle({ userId });

    expect(progressRepo.size).toBe(2);
    const all = progressRepo.all();
    expect(all.every((p) => p.userId === userId)).toBe(true);
    expect(all.every((p) => p.currentValue.value === 0)).toBe(true);
    expect(all.every((p) => !p.isUnlocked())).toBe(true);
    expect(all.every((p) => p.achievementTier === 'BRONZE')).toBe(true);
    expect(all.every((p) => p.achievementCategory === 'WORKOUT')).toBe(true);
  });

  it('does nothing when there are no active definitions', async () => {
    // inactive definition should not trigger progress creation
    const d = makeAchievementDefinition({ code: 'FIRST_WORKOUT', active: false });
    await definitionRepo.save(d);

    const handler = new OnUserCreated(definitionRepo, progressRepo);
    await handler.handle({ userId: generateId() });

    expect(progressRepo.size).toBe(0);
  });

  it('is idempotent — does not create duplicate progress records on second call', async () => {
    const d = makeAchievementDefinition({ code: 'FIRST_WORKOUT', active: true });
    await definitionRepo.save(d);

    const handler = new OnUserCreated(definitionRepo, progressRepo);
    const userId = generateId();
    await handler.handle({ userId });
    await handler.handle({ userId });

    // Still only 1 record for this user + definition
    expect(progressRepo.size).toBe(1);
  });

  it('only creates records for the new user — not other users', async () => {
    const d = makeAchievementDefinition({ code: 'FIRST_WORKOUT', active: true });
    await definitionRepo.save(d);

    const handler = new OnUserCreated(definitionRepo, progressRepo);
    const userId1 = generateId();
    const userId2 = generateId();

    await handler.handle({ userId: userId1 });
    await handler.handle({ userId: userId2 });

    const all = progressRepo.all();
    expect(all).toHaveLength(2);
    expect(all.map((p) => p.userId)).toContain(userId1);
    expect(all.map((p) => p.userId)).toContain(userId2);
  });
});
