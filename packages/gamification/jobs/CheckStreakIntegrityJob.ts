import type { IScheduledJob } from '../shared/jobs/IScheduledJob.js';
import { JobResult } from '../shared/jobs/JobResult.js';
import type { CheckStreakIntegrity } from '../application/use-cases/check-streak-integrity.js';

/**
 * Scheduled job that runs the anti-fraud streak integrity audit.
 *
 * ## Schedule (ADR-0066)
 *
 * Cron: `0 3 * * 0` — weekly on Sunday at 03:00 UTC.
 * Running weekly (not daily) keeps computational cost reasonable.
 * The daily ComputeStreakDaysMetricsJob (packages/metrics) handles
 * analytical recomputation; this job is dedicated to fraud detection.
 *
 * ## What it does
 *
 * For every active StreakTracker (currentStreak > 0), recomputes the
 * expected streak from execution history and compares it to the stored
 * value. Discrepancies emit `StreakIntegrityViolationEvent` for review.
 *
 * ## What it does NOT do
 *
 * - Does NOT modify any StreakTracker state.
 * - Does NOT break streaks.
 * - Does NOT auto-spend freeze tokens.
 *
 * See `CheckStreakIntegrity` use case for algorithm details.
 */
export class CheckStreakIntegrityJob implements IScheduledJob {
  public readonly name = 'CheckStreakIntegrity';
  public readonly schedule = '0 3 * * 0'; // weekly on Sunday at 03:00 UTC

  constructor(private readonly checkIntegrity: CheckStreakIntegrity) {}

  async execute(): Promise<JobResult> {
    const result = await this.checkIntegrity.execute();

    if (result.isLeft()) {
      /* c8 ignore next 5 — DomainErrors always extend Error; defensive coercion for future types */
      return JobResult.failure(
        result.value instanceof Error ? result.value : new Error(result.value.message),
      );
    }

    const { processed, clean, violations } = result.value;

    if (violations > 0) {
      // eslint-disable-next-line no-console
      console.warn('[CheckStreakIntegrityJob] Violations detected:', {
        processed,
        clean,
        violations,
      });
    }

    return JobResult.success({
      processed,
      clean,
      violations,
      timestamp: new Date().toISOString(),
    });
  }
}
