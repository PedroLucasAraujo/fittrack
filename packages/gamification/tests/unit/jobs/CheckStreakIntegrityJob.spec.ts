import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateId, left } from '@fittrack/core';
import { CheckStreakIntegrityJob } from '../../../jobs/CheckStreakIntegrityJob.js';
import { CheckStreakIntegrity } from '../../../application/use-cases/check-streak-integrity.js';
import { JobResult } from '../../../shared/jobs/JobResult.js';
import { InMemoryStreakTrackerRepository } from '../../repositories/in-memory-streak-tracker-repository.js';
import { InMemoryGamificationEventPublisher } from '../../stubs/in-memory-gamification-event-publisher.js';
import { InMemoryExecutionQueryService } from '../../stubs/in-memory-execution-query-service.js';
import { makeStreakTracker } from '../../helpers/make-streak-tracker.js';
import { InvalidActivityDayError } from '../../../domain/errors/invalid-activity-day-error.js';

afterEach(() => vi.restoreAllMocks());

describe('CheckStreakIntegrityJob', () => {
  it('has the correct schedule (weekly Sunday 03:00 UTC)', () => {
    const repo = new InMemoryStreakTrackerRepository();
    const publisher = new InMemoryGamificationEventPublisher();
    const qs = new InMemoryExecutionQueryService();
    const job = new CheckStreakIntegrityJob(new CheckStreakIntegrity(repo, qs, publisher));
    expect(job.schedule).toBe('0 3 * * 0');
    expect(job.name).toBe('CheckStreakIntegrity');
  });

  it('returns JobResult.success with stats on clean run', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const repo = new InMemoryStreakTrackerRepository();
    const publisher = new InMemoryGamificationEventPublisher();
    const qs = new InMemoryExecutionQueryService();
    const useCase = new CheckStreakIntegrity(repo, qs, publisher);
    const job = new CheckStreakIntegrityJob(useCase);

    const jobResult = await job.execute();

    expect(jobResult.isSuccess).toBe(true);
    expect(jobResult.data).toMatchObject({ processed: 0, clean: 0, violations: 0 });
  });

  it('returns JobResult.success and logs warning on violations', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const repo = new InMemoryStreakTrackerRepository();
    const publisher = new InMemoryGamificationEventPublisher();
    const qs = new InMemoryExecutionQueryService();

    const userId = generateId();
    repo.items.push(
      makeStreakTracker({ userId, currentStreak: 99, lastActivityDay: '2025-03-09' }),
    );
    qs.setActivityDays(userId, ['2025-03-09']); // supports only 1

    const useCase = new CheckStreakIntegrity(repo, qs, publisher);
    const job = new CheckStreakIntegrityJob(useCase);

    const jobResult = await job.execute();

    expect(jobResult.isSuccess).toBe(true);
    expect(jobResult.data).toMatchObject({ violations: 1 });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns JobResult.failure when use case returns Left (DomainError)', async () => {
    const repo = new InMemoryStreakTrackerRepository();
    const publisher = new InMemoryGamificationEventPublisher();
    const qs = new InMemoryExecutionQueryService();
    const useCase = new CheckStreakIntegrity(repo, qs, publisher);
    vi.spyOn(useCase, 'execute').mockResolvedValue(
      left(new InvalidActivityDayError('forced failure')),
    );
    const job = new CheckStreakIntegrityJob(useCase);

    const jobResult = await job.execute();

    expect(jobResult.isSuccess).toBe(false);
    expect(jobResult.error).toBeInstanceOf(Error);
    expect(jobResult.error?.message).toContain('forced failure');
  });

  it('returns JobResult.failure when use case returns Left (plain Error instance)', async () => {
    const repo = new InMemoryStreakTrackerRepository();
    const publisher = new InMemoryGamificationEventPublisher();
    const qs = new InMemoryExecutionQueryService();
    const useCase = new CheckStreakIntegrity(repo, qs, publisher);
    const cause = new Error('network failure');
    vi.spyOn(useCase, 'execute').mockResolvedValue(left(cause as never));
    const job = new CheckStreakIntegrityJob(useCase);

    const jobResult = await job.execute();

    expect(jobResult.isSuccess).toBe(false);
    expect(jobResult.error).toBe(cause);
  });

  it('JobResult.failure stores the error and marks isSuccess=false', () => {
    const err = new Error('test error');
    const result = JobResult.failure(err);
    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe(err);
    expect(result.data).toBeUndefined();
  });
});
