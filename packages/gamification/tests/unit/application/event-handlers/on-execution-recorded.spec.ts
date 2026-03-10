import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { OnExecutionRecorded } from '../../../../application/event-handlers/on-execution-recorded.js';
import { UpdateStreakTracker } from '../../../../application/use-cases/update-streak-tracker.js';
import { InMemoryStreakTrackerRepository } from '../../../repositories/in-memory-streak-tracker-repository.js';
import { InMemoryGamificationEventPublisher } from '../../../stubs/in-memory-gamification-event-publisher.js';

afterEach(() => vi.restoreAllMocks());

describe('OnExecutionRecorded', () => {
  it('calls UpdateStreakTracker for CONFIRMED execution', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const repo = new InMemoryStreakTrackerRepository();
    const publisher = new InMemoryGamificationEventPublisher();
    const updateUseCase = new UpdateStreakTracker(repo, publisher);
    const handler = new OnExecutionRecorded(updateUseCase);

    const clientId = generateId();
    await handler.handle({
      executionId: generateId(),
      clientId,
      logicalDay: '2025-03-10',
      status: 'CONFIRMED',
    });

    expect(repo.items).toHaveLength(1);
    expect(repo.items[0]!.currentStreak).toBe(1);
  });

  it('skips non-CONFIRMED executions', async () => {
    const repo = new InMemoryStreakTrackerRepository();
    const publisher = new InMemoryGamificationEventPublisher();
    const updateUseCase = new UpdateStreakTracker(repo, publisher);
    const handler = new OnExecutionRecorded(updateUseCase);

    await handler.handle({
      executionId: generateId(),
      clientId: generateId(),
      logicalDay: '2025-03-10',
      status: 'PENDING',
    });

    expect(repo.items).toHaveLength(0);
  });

  it('skips CANCELLED executions', async () => {
    const repo = new InMemoryStreakTrackerRepository();
    const publisher = new InMemoryGamificationEventPublisher();
    const updateUseCase = new UpdateStreakTracker(repo, publisher);
    const handler = new OnExecutionRecorded(updateUseCase);

    await handler.handle({
      executionId: generateId(),
      clientId: generateId(),
      logicalDay: '2025-03-10',
      status: 'CANCELLED',
    });

    expect(repo.items).toHaveLength(0);
  });

  it('logs a warning (without PII) when use case returns Left', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const repo = new InMemoryStreakTrackerRepository();
    const publisher = new InMemoryGamificationEventPublisher();
    const updateUseCase = new UpdateStreakTracker(repo, publisher);
    const handler = new OnExecutionRecorded(updateUseCase);

    const executionId = generateId();
    await handler.handle({
      executionId,
      clientId: 'not-a-uuid', // invalid userId → use case returns Left
      logicalDay: '2025-03-10',
      status: 'CONFIRMED',
    });

    expect(warnSpy).toHaveBeenCalledOnce();
    const [, meta] = warnSpy.mock.calls[0]!;
    expect(meta).toMatchObject({ executionId });
    expect(meta).not.toHaveProperty('clientId'); // no PII (ADR-0037)
  });
});
