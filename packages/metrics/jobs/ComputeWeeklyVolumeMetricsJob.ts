import type { IScheduledJob } from '../shared/jobs/IScheduledJob.js';
import { JobResult } from '../shared/jobs/JobResult.js';
import type { IMetricRepository } from '../domain/repositories/metric-repository.js';
import type { ComputeWeeklyVolumeMetric } from '../application/use-cases/compute-weekly-volume-metric.js';
import type { DomainResult, DomainError } from '@fittrack/core';
import type { Left } from '@fittrack/core';
import type { UserTenantPair } from '../domain/repositories/metric-repository.js';

/** Maximum number of users to process in a single batch (ADR-0054 §3). */
const BATCH_SIZE = 1000;

/** Number of retry attempts per user before marking as failed (ADR-0054 §3). */
const MAX_RETRIES = 3;

/** Maximum number of failure details included in the result (ADR-0037 §4). */
const MAX_FAILURE_DETAILS = 10;

/** Exponential backoff base delay in ms. */
const BACKOFF_BASE_MS = 200;

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
 * Computes WEEKLY_VOLUME metrics for all active users every Sunday at 23:59 UTC.
 *
 * ## Schedule (ADR-0054 §3)
 *
 * Cron: `59 23 * * 0` — Sunday 23:59 UTC.
 * Window: the ISO week that just completed (Monday–Sunday).
 *
 * ## Batch processing (ADR-0054 §3)
 *
 * Users are processed in batches of 1000.
 * Each user is retried up to 3× with exponential backoff.
 * Continue-on-error: individual failures do not abort the job.
 *
 * ## Privacy (ADR-0037 §4)
 *
 * Failure details contain error codes and messages only — no user IDs.
 */
export class ComputeWeeklyVolumeMetricsJob implements IScheduledJob {
  public readonly name = 'ComputeWeeklyVolumeMetrics';
  public readonly schedule = '59 23 * * 0'; // Sunday 23:59 UTC

  constructor(
    private readonly metricRepo: IMetricRepository,
    private readonly computeWeeklyVolumeMetric: ComputeWeeklyVolumeMetric,
  ) {}

  async execute(): Promise<JobResult> {
    // 1. Derive the ISO week that just completed
    const now = new Date();
    // Find the most recent Monday that has passed (start of completed week)
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
    // Sunday = 0: the week that started 6 days ago (Mon) ended today
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now.getTime() - daysFromMonday * ONE_DAY_MS);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 6 * ONE_DAY_MS);

    const weekStartDate = weekStart.toISOString().slice(0, 10);
    const weekEndDate = weekEnd.toISOString().slice(0, 10);

    // 2. Find (userId, professionalProfileId) pairs that had activity this week.
    // SYSTEM-scope query spanning tenants — each pair carries the correct tenant so
    // the use case creates the Metric with the right professionalProfileId (ADR-0025 §3).
    let pairs: UserTenantPair[];
    try {
      pairs = await this.metricRepo.findUsersToComputeWeeklyVolume(weekStartDate, weekEndDate);
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
        weekStartDate,
        weekEndDate,
        message: 'No active users found for this week',
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
              this.computeWeeklyVolumeMetric.execute({
                userId,
                professionalProfileId,
                weekStartDate,
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
      console.error('[ComputeWeeklyVolumeMetricsJob] Partial failures:', {
        processed: totalProcessed,
        failed: totalFailed,
        failures: allFailures,
      });
    }

    return JobResult.success({
      processed: totalProcessed,
      succeeded: totalSucceeded,
      failed: totalFailed,
      weekStartDate,
      weekEndDate,
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
      // Domain errors are not retried (they are deterministic failures)
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
