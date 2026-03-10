import type { JobResult } from './JobResult.js';

/**
 * Contract for all scheduled background jobs in the Gamification context.
 *
 * Jobs are pure orchestrators — they MUST NOT contain domain logic.
 * All domain mutations go through UseCases (ADR-0009, ADR-0047).
 */
export interface IScheduledJob {
  /** Unique, human-readable identifier for this job. */
  readonly name: string;

  /** Cron expression (UTC) for the execution schedule. */
  readonly schedule: string;

  /** Runs the job and returns an aggregated result. Never throws. */
  execute(): Promise<JobResult>;
}
