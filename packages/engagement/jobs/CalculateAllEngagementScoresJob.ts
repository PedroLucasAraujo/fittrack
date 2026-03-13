import type { IScheduledJob } from '../shared/jobs/IScheduledJob.js';
import { JobResult } from '../shared/jobs/JobResult.js';
import type { IUserEngagementRepository } from '../domain/repositories/IUserEngagementRepository.js';
import type { CalculateUserEngagementUseCase } from '../application/use-cases/CalculateUserEngagementUseCase.js';

const ACTIVE_USERS_WINDOW_DAYS = 90;
const BATCH_SIZE = 1000;

/**
 * Daily job that recalculates engagement scores for all active users (ADR-0054).
 *
 * ## Schedule
 * Daily at 00:00 UTC (`0 0 * * *`).
 *
 * ## Scope
 * Users with activity within the last 90 days are considered active.
 * Inactive users are skipped to reduce database load.
 *
 * ## Batching
 * Users are processed in batches of 1000, each batch in parallel.
 * Partial failures do not stop the job — errors are collected and returned.
 *
 * ## Notes
 * - SYSTEM-scope query spanning tenants (documented per ADR-0054).
 * - No PII in logs (ADR-0037): user IDs are not logged.
 * - This job is a pure orchestrator — all domain logic is in UseCases.
 */
export class CalculateAllEngagementScoresJob implements IScheduledJob {
  public readonly name = 'CalculateAllEngagementScores';
  public readonly schedule = '0 0 * * *';

  constructor(
    private readonly engagementRepo: IUserEngagementRepository,
    private readonly calculateEngagementUseCase: CalculateUserEngagementUseCase,
  ) {}

  async execute(): Promise<JobResult> {
    let activeUserIds: string[];

    try {
      activeUserIds = await this.engagementRepo.findActiveUsers(ACTIVE_USERS_WINDOW_DAYS);
    } catch (err) {
      return JobResult.failure(err instanceof Error ? err : new Error(String(err)));
    }

    const total = activeUserIds.length;
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ index: number; error: string }> = [];

    // Process in batches to avoid overwhelming the database
    const batches = this.chunk(activeUserIds, BATCH_SIZE);

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(async (userId, batchIndex) => {
          // We need professionalProfileId but findActiveUsers only returns userId.
          // The use case will load the aggregate which carries professionalProfileId.
          // For new users without an aggregate, we pass empty string — the use case
          // will create a new aggregate only when professionalProfileId is provided.
          // In practice, the daily job only processes users with existing aggregates.
          const engagement = await this.engagementRepo.findByUser(userId);
          if (!engagement) {
            // Skip — no engagement record yet (user never triggered a calculation)
            return;
          }

          const result = await this.calculateEngagementUseCase.execute({
            userId,
            professionalProfileId: engagement.professionalProfileId,
          });

          if (result.isLeft()) {
            throw new Error(result.value.message);
          }
        }),
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          succeeded++;
        } else {
          failed++;
          if (errors.length < 10) {
            errors.push({ index: i, error: result.reason?.message ?? 'Unknown error' });
          }
        }
      }
    }

    return JobResult.success({
      total,
      succeeded,
      failed,
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
