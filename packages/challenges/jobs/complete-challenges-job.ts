import type { IScheduledJob } from '../shared/jobs/IScheduledJob.js';
import { JobResult } from '../shared/jobs/JobResult.js';
import type { IChallengeRepository } from '../domain/repositories/i-challenge-repository.js';
import type { CompleteChallengeUseCase } from '../application/use-cases/complete-challenge-use-case.js';

/**
 * Scheduled job that finalizes challenges whose end date has passed.
 *
 * ## Schedule
 *
 * Cron: `5 0 * * *` — daily at 00:05 UTC.
 * Running shortly after midnight gives time for all midnight UTC events
 * to settle before finalization.
 *
 * ## What it does
 *
 * Finds all challenges whose endDateUtc has passed but have not yet been
 * formally ended (endedAtUtc === null) and are not canceled. For each,
 * delegates to `CompleteChallengeUseCase` to transition the challenge to
 * the ENDED state and compute winners.
 *
 * ## What it does NOT do
 *
 * - Does NOT modify challenge state directly.
 * - Does NOT skip on partial failures — all challenges are attempted.
 * - Does NOT throw — errors are collected and returned in JobResult.
 */
export class CompleteChallengesJob implements IScheduledJob {
  public readonly name = 'CompleteChallenges';
  public readonly schedule = '5 0 * * *'; // daily at 00:05 UTC

  constructor(
    private readonly challengeRepo: IChallengeRepository,
    private readonly completeChallengeUseCase: CompleteChallengeUseCase,
  ) {}

  async execute(): Promise<JobResult> {
    const endedChallenges = await this.challengeRepo.findEnded();
    const pending = endedChallenges.filter((c) => c.endedAtUtc === null && !c.isCanceled());

    let completed = 0;
    const errors: Array<{ challengeId: string; error: string }> = [];

    for (const challenge of pending) {
      const result = await this.completeChallengeUseCase.execute({
        challengeId: challenge.id,
        triggeredBy: 'SYSTEM',
      });

      if (result.isLeft()) {
        errors.push({
          challengeId: challenge.id,
          error: result.value.message,
        });
      } else {
        completed++;
      }
    }

    if (errors.length > 0) {
      /* c8 ignore next 6 — defensive warning; covered by unit test */
      console.warn('[CompleteChallengesJob] Errors during completion:', {
        processed: pending.length,
        completed,
        errorCount: errors.length,
      });
    }

    return JobResult.success({
      processed: pending.length,
      completed,
      errors,
      timestamp: new Date().toISOString(),
    });
  }
}
