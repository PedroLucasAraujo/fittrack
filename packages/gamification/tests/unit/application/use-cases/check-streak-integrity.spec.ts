import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CheckStreakIntegrity } from '../../../../application/use-cases/check-streak-integrity.js';
import { InMemoryStreakTrackerRepository } from '../../../repositories/in-memory-streak-tracker-repository.js';
import { InMemoryGamificationEventPublisher } from '../../../stubs/in-memory-gamification-event-publisher.js';
import { InMemoryExecutionQueryService } from '../../../stubs/in-memory-execution-query-service.js';
import { makeStreakTracker } from '../../../helpers/make-streak-tracker.js';

afterEach(() => vi.restoreAllMocks());

function makeUseCase() {
  const repo = new InMemoryStreakTrackerRepository();
  const publisher = new InMemoryGamificationEventPublisher();
  const queryService = new InMemoryExecutionQueryService();
  const useCase = new CheckStreakIntegrity(repo, queryService, publisher);
  return { repo, publisher, queryService, useCase };
}

describe('CheckStreakIntegrity', () => {
  it('returns zeroed stats when no active trackers', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { useCase } = makeUseCase();
    const result = await useCase.execute();
    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ processed: 0, clean: 0, violations: 0 });
  });

  it('marks clean when tracker streak matches recomputed streak', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, queryService, publisher, useCase } = makeUseCase();
    const userId = generateId();
    repo.items.push(makeStreakTracker({ userId, currentStreak: 2, lastActivityDay: '2025-03-09' }));
    // Execution history supports a streak of 2: Mar 08 + Mar 09
    queryService.setActivityDays(userId, ['2025-03-08', '2025-03-09']);

    const result = await useCase.execute();
    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ processed: 1, clean: 1, violations: 0 });
    expect(publisher.integrityViolationEvents).toHaveLength(0);
  });

  it('emits StreakIntegrityViolationEvent when discrepancy detected', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, queryService, publisher, useCase } = makeUseCase();
    const userId = generateId();
    // Tracker claims streak of 10 but execution history only supports 2
    repo.items.push(
      makeStreakTracker({ userId, currentStreak: 10, lastActivityDay: '2025-03-09' }),
    );
    queryService.setActivityDays(userId, ['2025-03-08', '2025-03-09']);

    const result = await useCase.execute();
    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ processed: 1, clean: 0, violations: 1 });
    expect(publisher.integrityViolationEvents).toHaveLength(1);
    expect(publisher.integrityViolationEvents[0]!.payload.trackerStreak).toBe(10);
    expect(publisher.integrityViolationEvents[0]!.payload.expectedStreak).toBe(2);
    expect(publisher.integrityViolationEvents[0]!.payload.discrepancy).toBe(8);
  });

  it('reports violation when active tracker has zero execution history', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, queryService, publisher, useCase } = makeUseCase();
    const userId = generateId();
    repo.items.push(makeStreakTracker({ userId, currentStreak: 5, lastActivityDay: '2025-03-09' }));
    // No activity days → query service returns []
    queryService.setActivityDays(userId, []);

    const result = await useCase.execute();
    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ processed: 1, clean: 0, violations: 1 });
    expect(publisher.integrityViolationEvents[0]!.payload.expectedStreak).toBe(0);
  });

  it('does NOT process trackers with currentStreak = 0 (only active)', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, useCase } = makeUseCase();
    repo.items.push(makeStreakTracker({ currentStreak: 0 }));

    const result = await useCase.execute();
    expect(result.value).toMatchObject({ processed: 0 });
  });

  it('processes multiple trackers and counts correctly', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, queryService, publisher, useCase } = makeUseCase();

    const userId1 = generateId();
    const userId2 = generateId();
    const userId3 = generateId();

    repo.items.push(
      makeStreakTracker({ userId: userId1, currentStreak: 2, lastActivityDay: '2025-03-09' }),
    );
    repo.items.push(
      makeStreakTracker({ userId: userId2, currentStreak: 5, lastActivityDay: '2025-03-09' }),
    ); // violation
    repo.items.push(
      makeStreakTracker({ userId: userId3, currentStreak: 1, lastActivityDay: '2025-03-09' }),
    );

    queryService.setActivityDays(userId1, ['2025-03-08', '2025-03-09']); // supports 2 ✓
    queryService.setActivityDays(userId2, ['2025-03-09']); // supports 1 ≠ 5 ✗
    queryService.setActivityDays(userId3, ['2025-03-09']); // supports 1 ✓

    const result = await useCase.execute();
    expect(result.value).toMatchObject({ processed: 3, clean: 2, violations: 1 });
    expect(publisher.integrityViolationEvents).toHaveLength(1);
  });
});
