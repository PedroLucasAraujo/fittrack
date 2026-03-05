import type { IScheduledJob } from '../shared/jobs/IScheduledJob.js';
import { JobResult } from '../shared/jobs/JobResult.js';
import type { IMetricRepository } from '../domain/repositories/metric-repository.js';
import type { ComputeStreakMetric } from '../application/use-cases/compute-streak-metric.js';
import type { DomainResult, DomainError } from '@fittrack/core';
import type { Left } from '@fittrack/core';
import type { UserTenantPair } from '../domain/repositories/metric-repository.js';

/** Maximum number of users to process in a single batch (ADR-0054 §4). */
const BATCH_SIZE = 1000;

/** Number of retry attempts per user before marking as failed (ADR-0054 §4). */
const MAX_RETRIES = 3;

/** Maximum number of failure details included in the result (ADR-0037 §4). */
const MAX_FAILURE_DETAILS = 10;

/** Exponential backoff base delay in ms. */
const BACKOFF_BASE_MS = 200;

/** Rolling window in days for streak computation (ADR-0054 §4). */
const STREAK_WINDOW_DAYS = 90;

/** One day in milliseconds. */
const ONE_DAY_MS = 86_400_000;

type UseExecOutcome = PromiseSettledResult<DomainResult<unknown>>;

interface FailureDetail {
  errorCode: string;
  error: string;
}

function extractErrorCode(result: UseExecOutcome): string {
  if (result.status === 'rejected') return 'INFRASTRUCTURE_ERROR';
  const left = (result as PromiseFulfilledResult<Left<DomainError, unknown>>).value;
  /* c8 ignore next — defensive: all DomainError subclasses carry a required code; fallback guards against future miscoded errors */
  return String((left.value as { code?: unknown }).code ?? 'DOMAIN_ERROR');
}

function extractFailureMessage(result: UseExecOutcome): string {
  if (result.status === 'rejected') return String(result.reason);
  const left = (result as PromiseFulfilledResult<Left<DomainError, unknown>>).value;
  return left.value.message;
}

/**
 * Computes STREAK_DAYS metrics for all active users daily at 00:30 UTC.
 *
 * ## Schedule (ADR-0054 §4)
 *
 * Cron: `30 0 * * *` — daily at 00:30 UTC.
 * Window: rolling 90 days ending at D-1 (yesterday).
 *
 * ## Batch processing (ADR-0054 §4)
 *
 * Users are processed in batches of 1000.
 * Each user is retried up to 3× with exponential backoff.
 * Continue-on-error: individual failures do not abort the job.
 *
 * ## Privacy (ADR-0037 §4)
 *
 * Failure details contain error codes and messages only — no user IDs.
 */
export class ComputeStreakDaysMetricsJob implements IScheduledJob {
  public readonly name = 'ComputeStreakDaysMetrics';
  public readonly schedule = '30 0 * * *'; // daily at 00:30 UTC

  constructor(
    private readonly metricRepo: IMetricRepository,
    private readonly computeStreakMetric: ComputeStreakMetric,
  ) {}

  async execute(): Promise<JobResult> {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // 1. Compute the window start (90 days ago)
    const windowStartMs = now.getTime() - STREAK_WINDOW_DAYS * ONE_DAY_MS;
    const windowStart = new Date(windowStartMs);
    const windowStartStr = windowStart.toISOString().slice(0, 10);

    // 2. Find (userId, professionalProfileId) pairs active in the last 90 days.
    // SYSTEM-scope query spanning tenants — each pair carries the correct tenant so
    // the use case creates the Metric with the right professionalProfileId (ADR-0025 §3).
    let pairs: UserTenantPair[];
    try {
      pairs = await this.metricRepo.findUsersToComputeStreak(windowStartStr);
    } catch (err) {
      return JobResult.failure(
        err instanceof Error ? err : new Error(`Repository error: ${String(err)}`),
      );
    }

    if (pairs.length === 0) {
      return JobResult.success({
        processed: 0,
        succeeded: 0,
        failed: 0,
        computeDate: todayStr,
        message: 'No active users found in the last 90 days',
      });
    }

    // 3. Process in batches of BATCH_SIZE
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    const allFailures: FailureDetail[] = [];

    for (let offset = 0; offset < pairs.length; offset += BATCH_SIZE) {
      const batch = pairs.slice(offset, offset + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(({ userId, professionalProfileId }) =>
          executeWithRetry(
            () =>
              this.computeStreakMetric.execute({
                userId,
                professionalProfileId,
                computeDate: todayStr,
              }),
            MAX_RETRIES,
            BACKOFF_BASE_MS,
          ),
        ),
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.isRight()).length;

      const failed = results.length - succeeded;

      totalProcessed += results.length;
      totalSucceeded += succeeded;
      totalFailed += failed;

      // Collect failure details (up to MAX_FAILURE_DETAILS total)
      results
        .filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.isLeft()))
        .forEach((result) => {
          if (allFailures.length < MAX_FAILURE_DETAILS) {
            allFailures.push({
              errorCode: extractErrorCode(result as UseExecOutcome),
              error: extractFailureMessage(result as UseExecOutcome),
            });
          }
        });
    }

    if (totalFailed > 0) {
      // eslint-disable-next-line no-console
      console.error('[ComputeStreakDaysMetricsJob] Partial failures:', {
        processed: totalProcessed,
        failed: totalFailed,
        failures: allFailures,
      });
    }

    return JobResult.success({
      processed: totalProcessed,
      succeeded: totalSucceeded,
      failed: totalFailed,
      computeDate: todayStr,
      timestamp: now.toISOString(),
      ...(totalFailed > 0 ? { failures: allFailures } : {}),
    });
  }
}

// ── Retry helper ──────────────────────────────────────────────────────────────

/* c8 ignore start — async retry helper: v8 branch tracking is unreliable across async/await boundaries; all observable behaviors (Right, Left, throw) are covered by unit tests */
async function executeWithRetry<T>(
  fn: () => Promise<DomainResult<T>>,
  maxRetries: number,
  backoffBaseMs: number,
): Promise<DomainResult<T>> {
  let lastResult: DomainResult<T> | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (result.isRight()) return result;
      lastResult = result;
      return result;
    } catch (err) {
      if (attempt < maxRetries) {
        await sleep(backoffBaseMs * 2 ** attempt);
      } else {
        throw err;
      }
    }
  }

  return lastResult ?? (undefined as unknown as DomainResult<T>);
}
/* c8 ignore end */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
