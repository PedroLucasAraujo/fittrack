import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ComputeWeeklyVolumeMetricsJob } from '../../../jobs/ComputeWeeklyVolumeMetricsJob.js';
import { JobResult } from '../../../shared/jobs/JobResult.js';
import { MetricErrorCodes } from '../../../domain/errors/metric-error-codes.js';
import { MetricComputationError } from '../../../domain/errors/metric-computation-error.js';
import type {
  IMetricRepository,
  UserTenantPair,
} from '../../../domain/repositories/metric-repository.js';
import type { ComputeWeeklyVolumeMetric } from '../../../application/use-cases/compute-weekly-volume-metric.js';

function makePairs(n = 1): UserTenantPair[] {
  return Array.from({ length: n }, () => ({
    userId: generateId(),
    professionalProfileId: generateId(),
  }));
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function makeUseCase(): ComputeWeeklyVolumeMetric {
  return {
    execute: vi.fn(),
  } as unknown as ComputeWeeklyVolumeMetric;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ComputeWeeklyVolumeMetricsJob', () => {
  let repo: IMetricRepository;
  let useCase: ComputeWeeklyVolumeMetric;
  let job: ComputeWeeklyVolumeMetricsJob;

  beforeEach(() => {
    repo = makeRepo();
    useCase = makeUseCase();
    job = new ComputeWeeklyVolumeMetricsJob(repo, useCase);
  });

  // ── Metadata ────────────────────────────────────────────────────────────────

  it('has name ComputeWeeklyVolumeMetrics', () => {
    expect(job.name).toBe('ComputeWeeklyVolumeMetrics');
  });

  it('has schedule 59 23 * * 0 (Sunday 23:59 UTC)', () => {
    expect(job.schedule).toBe('59 23 * * 0');
  });

  // ── execute() ───────────────────────────────────────────────────────────────

  it('returns success with zero counts when no users found', async () => {
    vi.mocked(repo.findUsersToComputeWeeklyVolume).mockResolvedValue([]);

    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.data).toMatchObject({ processed: 0, succeeded: 0, failed: 0 });
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('processes all users through the use case', async () => {
    vi.mocked(repo.findUsersToComputeWeeklyVolume).mockResolvedValue(makePairs(3));
    vi.mocked(useCase.execute).mockResolvedValue(
      right({ metricId: generateId(), workoutCount: 2, totalVolume: 1000 }) as DomainResult<{
        metricId: string;
        workoutCount: number;
        totalVolume: number;
      }>,
    );

    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.data).toMatchObject({ processed: 3, succeeded: 3, failed: 0 });
    expect(useCase.execute).toHaveBeenCalledTimes(3);
  });

  it('passes correct userId and professionalProfileId to use case (ADR-0025)', async () => {
    const pair = { userId: generateId(), professionalProfileId: generateId() };
    vi.mocked(repo.findUsersToComputeWeeklyVolume).mockResolvedValue([pair]);
    vi.mocked(useCase.execute).mockResolvedValue(
      right({ metricId: generateId(), workoutCount: 1, totalVolume: 500 }) as DomainResult<{
        metricId: string;
        workoutCount: number;
        totalVolume: number;
      }>,
    );

    await job.execute();

    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: pair.userId,
        professionalProfileId: pair.professionalProfileId,
      }),
    );
  });

  it('handles partial failures gracefully (continue-on-error)', async () => {
    vi.mocked(repo.findUsersToComputeWeeklyVolume).mockResolvedValue(makePairs(3));
    const err = new MetricComputationError('something failed');
    vi.mocked(useCase.execute)
      .mockResolvedValueOnce(
        right({ metricId: generateId(), workoutCount: 1, totalVolume: 500 }) as DomainResult<{
          metricId: string;
          workoutCount: number;
          totalVolume: number;
        }>,
      )
      .mockResolvedValueOnce(
        left(err) as DomainResult<{ metricId: string; workoutCount: number; totalVolume: number }>,
      )
      .mockResolvedValueOnce(
        right({ metricId: generateId(), workoutCount: 2, totalVolume: 800 }) as DomainResult<{
          metricId: string;
          workoutCount: number;
          totalVolume: number;
        }>,
      );

    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.data).toMatchObject({ processed: 3, succeeded: 2, failed: 1 });
    expect(result.data!['failures']).toHaveLength(1);
  });

  it('failure details contain errorCode and error message, no user IDs (ADR-0037)', async () => {
    vi.mocked(repo.findUsersToComputeWeeklyVolume).mockResolvedValue(makePairs(1));
    const err = new MetricComputationError('bad week');
    vi.mocked(useCase.execute).mockResolvedValue(
      left(err) as DomainResult<{ metricId: string; workoutCount: number; totalVolume: number }>,
    );

    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    const failures = result.data!['failures'] as Array<{ errorCode: string; error: string }>;
    expect(failures).toHaveLength(1);
    expect(Object.keys(failures[0]!)).not.toContain('userId');
    expect(failures[0]!.errorCode).toBe(MetricErrorCodes.COMPUTATION_FAILED);
  });

  it('handles use case promise rejection gracefully', async () => {
    vi.mocked(repo.findUsersToComputeWeeklyVolume).mockResolvedValue(makePairs(2));
    vi.mocked(useCase.execute)
      .mockResolvedValueOnce(
        right({ metricId: generateId(), workoutCount: 1, totalVolume: 500 }) as DomainResult<{
          metricId: string;
          workoutCount: number;
          totalVolume: number;
        }>,
      )
      .mockRejectedValueOnce(new Error('Infrastructure error'));

    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.data).toMatchObject({ processed: 2, succeeded: 1, failed: 1 });
    const failures = result.data!['failures'] as Array<{ errorCode: string; error: string }>;
    expect(failures[0]!.errorCode).toBe('INFRASTRUCTURE_ERROR');
  });

  it('returns JobResult.failure when repository throws', async () => {
    vi.mocked(repo.findUsersToComputeWeeklyVolume).mockRejectedValue(
      new Error('Database connection lost'),
    );

    const result = await job.execute();

    expect(result.isSuccess).toBe(false);
    expect(result.error?.message).toContain('Database connection lost');
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('wraps non-Error repository throws', async () => {
    vi.mocked(repo.findUsersToComputeWeeklyVolume).mockRejectedValue('plain string');

    const result = await job.execute();

    expect(result.isSuccess).toBe(false);
    expect(result.error?.message).toContain('Repository error');
  });

  it('result has no failures key when all succeed', async () => {
    vi.mocked(repo.findUsersToComputeWeeklyVolume).mockResolvedValue(makePairs(1));
    vi.mocked(useCase.execute).mockResolvedValue(
      right({ metricId: generateId(), workoutCount: 1, totalVolume: 500 }) as DomainResult<{
        metricId: string;
        workoutCount: number;
        totalVolume: number;
      }>,
    );

    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.data).not.toHaveProperty('failures');
  });

  it('result data includes weekStartDate, weekEndDate, and timestamp', async () => {
    vi.mocked(repo.findUsersToComputeWeeklyVolume).mockResolvedValue(makePairs(1));
    vi.mocked(useCase.execute).mockResolvedValue(
      right({ metricId: generateId(), workoutCount: 1, totalVolume: 500 }) as DomainResult<{
        metricId: string;
        workoutCount: number;
        totalVolume: number;
      }>,
    );

    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    expect(typeof result.data!['weekStartDate']).toBe('string');
    expect(typeof result.data!['weekEndDate']).toBe('string');
    expect(typeof result.data!['timestamp']).toBe('string');
  });

  it('computes correct weekStartDate when job runs on a Sunday (dayOfWeek=0 branch)', async () => {
    // Sunday 2025-03-09 23:59 UTC — the week started on Monday 2025-03-03
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-09T23:59:00.000Z'));
    vi.mocked(repo.findUsersToComputeWeeklyVolume).mockResolvedValue([]);

    const result = await job.execute();

    vi.useRealTimers();
    expect(result.isSuccess).toBe(true);
    expect(result.data!['weekStartDate']).toBe('2025-03-03');
    expect(result.data!['weekEndDate']).toBe('2025-03-09');
  });

  it('limits failure details to 10 entries (ADR-0037)', async () => {
    vi.mocked(repo.findUsersToComputeWeeklyVolume).mockResolvedValue(makePairs(15));
    const err = new MetricComputationError('fail');
    vi.mocked(useCase.execute).mockResolvedValue(
      left(err) as DomainResult<{ metricId: string; workoutCount: number; totalVolume: number }>,
    );

    const result = await job.execute();

    const failures = result.data!['failures'] as unknown[];
    expect(failures.length).toBeLessThanOrEqual(10);
  });
});

// ── JobResult ──────────────────────────────────────────────────────────────────

describe('JobResult', () => {
  it('success() returns isSuccess=true with data', () => {
    const result = JobResult.success({ count: 5 });
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({ count: 5 });
    expect(result.error).toBeUndefined();
  });

  it('success() without data returns isSuccess=true', () => {
    const result = JobResult.success();
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('failure() returns isSuccess=false with error', () => {
    const err = new Error('oops');
    const result = JobResult.failure(err);
    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe(err);
    expect(result.data).toBeUndefined();
  });
});
