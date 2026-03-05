import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { MetricComputationError } from '../../domain/errors/metric-computation-error.js';
import type { IMetricRepository } from '../../domain/repositories/metric-repository.js';
import type {
  GetUserWeeklyVolumeHistoryInputDTO,
  GetUserWeeklyVolumeHistoryOutputDTO,
} from '../dtos/get-user-weekly-volume-history-dto.js';

/** UUIDv4 regex (ADR-0047 §6). */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Default number of weeks to return. */
const DEFAULT_LAST_N_WEEKS = 4;

/**
 * Read-only use case: retrieves a user's WEEKLY_VOLUME metric history.
 *
 * ## No events dispatched
 *
 * This is a read-only operation — no domain events are emitted (ADR-0009 §3).
 *
 * ## Tenant isolation (ADR-0025)
 *
 * `professionalProfileId` scopes all repository queries.
 */
export class GetUserWeeklyVolumeHistory {
  constructor(private readonly metricRepo: IMetricRepository) {}

  async execute(
    dto: GetUserWeeklyVolumeHistoryInputDTO,
  ): Promise<DomainResult<GetUserWeeklyVolumeHistoryOutputDTO>> {
    // 1. Validate userId
    if (!UUID_V4_REGEX.test(dto.userId)) {
      return left(
        new MetricComputationError('userId must be a valid UUIDv4', { userId: '[redacted]' }),
      );
    }

    // 2. Validate professionalProfileId
    if (!UUID_V4_REGEX.test(dto.professionalProfileId)) {
      return left(
        new MetricComputationError('professionalProfileId must be a valid UUIDv4', {
          professionalProfileId: '[redacted]',
        }),
      );
    }

    // 3. Determine lastNWeeks
    const lastNWeeks = dto.lastNWeeks ?? DEFAULT_LAST_N_WEEKS;
    if (!Number.isInteger(lastNWeeks) || lastNWeeks < 1) {
      return left(
        new MetricComputationError(`lastNWeeks must be a positive integer; got ${lastNWeeks}`),
      );
    }

    // 4. Query repository
    const metrics = await this.metricRepo.findByUserLastNWeeks(
      dto.userId,
      lastNWeeks,
      dto.professionalProfileId,
    );

    // 5. Map to output DTO — ordered most-recent-first (repository guarantees order)
    const history = metrics.map((m) => ({
      metricId: m.id,
      weekStartDate: m.logicalDay.value,
      totalVolume: m.value,
      workoutCount: m.sourceExecutionIds.filter(
        (id) => id !== '00000000-0000-4000-8000-000000000000',
      ).length,
    }));

    return right({ history });
  }
}
