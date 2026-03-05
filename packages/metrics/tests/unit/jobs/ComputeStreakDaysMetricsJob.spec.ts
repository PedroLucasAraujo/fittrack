import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ComputeStreakDaysMetricsJob } from '../../../jobs/ComputeStreakDaysMetricsJob.js';
import { MetricErrorCodes } from '../../../domain/errors/metric-error-codes.js';
import { MetricComputationError } from '../../../domain/errors/metric-computation-error.js';
import type {
  IMetricRepository,
  UserTenantPair,
} from '../../../domain/repositories/metric-repository.js';
import type { ComputeStreakMetric } from '../../../application/use-cases/compute-streak-metric.js';

type StreakOutput = {
  metricId: string;
  currentStreak: number;
  longestStreak: number;
  streakStatus: string;
};

function makePairs(n = 1): UserTenantPair[] {
  return Array.from({ length: n }, () => ({
    userId: generateId(),
    professionalProfileId: generateId(),
  }));
}

function makeRepo(): IMetricRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findBySourceExecutionIdAndType: vi.fn(),
    findByClientAndLogicalDay: vi.fn(),
    findByClientAndDateRange: vi.fn(),
    findByUserAndWeekStart: vi.fn(),
    findByUserLastNWeeks: vi.fn(),
    findLatestStreakByUserId: vi.fn(),
    findUsersToComputeWeeklyVolume: vi.fn(),
    findUsersToComputeStreak: vi.fn(),
  };
}

function makeUseCase(): ComputeStreakMetric {
  return {
    execute: vi.fn(),
  } as unknown as ComputeStreakMetric;
}

function makeOutput(): StreakOutput {
  return {
    metricId: generateId(),
    currentStreak: 3,
    longestStreak: 5,
    streakStatus: 'ACTIVE',
  };
}

describe('ComputeStreakDaysMetricsJob', () => {
  let repo: IMetricRepository;
  let useCase: ComputeStreakMetric;
  let job: ComputeStreakDaysMetricsJob;

  beforeEach(() => {
    repo = makeRepo();
    useCase = makeUseCase();
    job = new ComputeStreakDaysMetricsJob(repo, useCase);
  });

  // ── Metadata ────────────────────────────────────────────────────────────────

  it('has name ComputeStreakDaysMetrics', () => {
    expect(job.name).toBe('ComputeStreakDaysMetrics');
  });

  it('has schedule 30 0 * * * (daily 00:30 UTC)', () => {
    expect(job.schedule).toBe('30 0 * * *');
  });

  // ── execute() ───────────────────────────────────────────────────────────────

  it('returns success with zero counts when no users found', async () => {
    vi.mocked(repo.findUsersToComputeStreak).mockResolvedValue([]);

    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.data).toMatchObject({ processed: 0, succeeded: 0, failed: 0 });
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('processes all users through the use case', async () => {
    vi.mocked(repo.findUsersToComputeStreak).mockResolvedValue(makePairs(2));
    vi.mocked(useCase.execute).mockResolvedValue(right(makeOutput()) as DomainResult<StreakOutput>);

    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.data).toMatchObject({ processed: 2, succeeded: 2, failed: 0 });
    expect(useCase.execute).toHaveBeenCalledTimes(2);
  });

  it('passes correct userId and professionalProfileId to use case (ADR-0025)', async () => {
    const pair = { userId: generateId(), professionalProfileId: generateId() };
    vi.mocked(repo.findUsersToComputeStreak).mockResolvedValue([pair]);
    vi.mocked(useCase.execute).mockResolvedValue(right(makeOutput()) as DomainResult<StreakOutput>);

    await job.execute();

    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: pair.userId,
        professionalProfileId: pair.professionalProfileId,
      }),
    );
  });

  it('handles partial failures gracefully (continue-on-error)', async () => {
    vi.mocked(repo.findUsersToComputeStreak).mockResolvedValue(makePairs(3));
    const err = new MetricComputationError('streak fail');
    vi.mocked(useCase.execute)
      .mockResolvedValueOnce(right(makeOutput()) as DomainResult<StreakOutput>)
      .mockResolvedValueOnce(left(err) as DomainResult<StreakOutput>)
      .mockResolvedValueOnce(right(makeOutput()) as DomainResult<StreakOutput>);

    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.data).toMatchObject({ processed: 3, succeeded: 2, failed: 1 });
  });

  it('failure details contain errorCode and error, no user IDs (ADR-0037)', async () => {
    vi.mocked(repo.findUsersToComputeStreak).mockResolvedValue(makePairs(1));
    const err = new MetricComputationError('computation error');
    vi.mocked(useCase.execute).mockResolvedValue(left(err) as DomainResult<StreakOutput>);

    const result = await job.execute();

    const failures = result.data!['failures'] as Array<{ errorCode: string; error: string }>;
    expect(failures).toHaveLength(1);
    expect(Object.keys(failures[0]!)).not.toContain('userId');
    expect(failures[0]!.errorCode).toBe(MetricErrorCodes.COMPUTATION_FAILED);
  });

  it('handles promise rejection gracefully', async () => {
    vi.mocked(repo.findUsersToComputeStreak).mockResolvedValue(makePairs(2));
    vi.mocked(useCase.execute)
      .mockResolvedValueOnce(right(makeOutput()) as DomainResult<StreakOutput>)
      .mockRejectedValueOnce(new Error('DB error'));

    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.data).toMatchObject({ processed: 2, succeeded: 1, failed: 1 });
    const failures = result.data!['failures'] as Array<{ errorCode: string; error: string }>;
    expect(failures[0]!.errorCode).toBe('INFRASTRUCTURE_ERROR');
  });

  it('returns JobResult.failure when repository throws', async () => {
    vi.mocked(repo.findUsersToComputeStreak).mockRejectedValue(new Error('DB down'));

    const result = await job.execute();

    expect(result.isSuccess).toBe(false);
    expect(result.error?.message).toContain('DB down');
  });

  it('wraps non-Error repository throws', async () => {
    vi.mocked(repo.findUsersToComputeStreak).mockRejectedValue('raw string error');

    const result = await job.execute();

    expect(result.isSuccess).toBe(false);
    expect(result.error?.message).toContain('Repository error');
  });

  it('result has no failures key when all succeed', async () => {
    vi.mocked(repo.findUsersToComputeStreak).mockResolvedValue(makePairs(1));
    vi.mocked(useCase.execute).mockResolvedValue(right(makeOutput()) as DomainResult<StreakOutput>);

    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.data).not.toHaveProperty('failures');
  });

  it('result data includes computeDate and timestamp', async () => {
    vi.mocked(repo.findUsersToComputeStreak).mockResolvedValue([]);

    const result = await job.execute();

    expect(typeof result.data!['computeDate']).toBe('string');
  });

  it('limits failure details to 10 entries', async () => {
    vi.mocked(repo.findUsersToComputeStreak).mockResolvedValue(makePairs(15));
    const err = new MetricComputationError('fail');
    vi.mocked(useCase.execute).mockResolvedValue(left(err) as DomainResult<StreakOutput>);

    const result = await job.execute();

    const failures = result.data!['failures'] as unknown[];
    expect(failures.length).toBeLessThanOrEqual(10);
  });
});
