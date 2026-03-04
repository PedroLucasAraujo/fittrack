import type { IScheduledJob } from '../shared/jobs/IScheduledJob.js';
import { JobResult } from '../shared/jobs/JobResult.js';
import type { IPlatformEntitlementRepository } from '../domain/repositories/platform-entitlement-repository.js';
import type { ExpireEntitlement } from '../application/use-cases/expire-entitlement.js';
import type { PlatformEntitlement } from '../domain/aggregates/platform-entitlement.js';
import type { DomainResult } from '@fittrack/core';

type ExpireOutcome = PromiseSettledResult<DomainResult<void>>;

interface FailureDetail {
  errorCode: string;
  error: string;
}

function extractFailureMessage(result: ExpireOutcome): string {
  if (result.status === 'rejected') return String(result.reason);
  return (result as PromiseFulfilledResult<DomainResult<void>>).value.value.message;
}

function extractErrorCode(result: ExpireOutcome): string {
  if (result.status === 'rejected') return 'INFRASTRUCTURE_ERROR';
  const domainError = (result as PromiseFulfilledResult<DomainResult<void>>).value.value;
  return String((domainError as { code?: unknown }).code ?? 'DOMAIN_ERROR');
}

/**
 * Scheduled job that expires PlatformEntitlements whose `expiresAt` has passed.
 *
 * Runs daily at midnight UTC (ADR-0054). Delegates all domain mutations to
 * `ExpireEntitlement` use case — no domain logic here (ADR-0009, ADR-0047).
 *
 * Partial failures are tolerated: the job succeeds overall and reports
 * individual failures in `result.data.failures` for observability.
 * Failures are logged without entity IDs (ADR-0037 §4).
 */
export class ExpirePlatformEntitlementsJob implements IScheduledJob {
  public readonly name = 'ExpirePlatformEntitlements';
  public readonly schedule = '0 0 * * *'; // daily at midnight UTC

  constructor(
    private readonly entitlementRepository: IPlatformEntitlementRepository,
    private readonly expireUseCase: ExpireEntitlement,
  ) {}

  async execute(): Promise<JobResult> {
    const nowUtc = new Date().toISOString();

    let expiredEntitlements: PlatformEntitlement[];
    try {
      expiredEntitlements = await this.entitlementRepository.findExpiredEntitlements(nowUtc);
    } catch (err) {
      return JobResult.failure(
        err instanceof Error ? err : new Error(`Repository error: ${String(err)}`),
      );
    }

    if (expiredEntitlements.length === 0) {
      return JobResult.success({
        processed: 0,
        succeeded: 0,
        failed: 0,
        message: 'No expired entitlements found',
      });
    }

    const results = await Promise.allSettled(
      expiredEntitlements.map((entitlement: PlatformEntitlement) =>
        this.expireUseCase.execute({
          entitlementId: entitlement.id,
          professionalProfileId: entitlement.professionalProfileId,
        }),
      ),
    );

    const succeeded = results.filter(
      (r): r is PromiseFulfilledResult<DomainResult<void>> =>
        r.status === 'fulfilled' && r.value.isRight(),
    ).length;

    const failed = results.length - succeeded;

    const failures: FailureDetail[] = results
      .map((result) => ({ result }))
      .filter(
        ({ result }) =>
          result.status === 'rejected' || (result.status === 'fulfilled' && result.value.isLeft()),
      )
      .map(({ result }) => ({
        errorCode: extractErrorCode(result as ExpireOutcome),
        error: extractFailureMessage(result as ExpireOutcome),
      }));

    // Log sanitized failure metadata only — no entity IDs (ADR-0037 §4)
    if (failed > 0) {
      console.error('[ExpirePlatformEntitlementsJob] Partial failures:', {
        processed: results.length,
        failed,
        failures,
      });
    }

    return JobResult.success({
      processed: results.length,
      succeeded,
      failed,
      timestamp: nowUtc,
      ...(failed > 0 ? { failures } : {}),
    });
  }
}
