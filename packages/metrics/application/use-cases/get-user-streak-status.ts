import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { MetricComputationError } from '../../domain/errors/metric-computation-error.js';
import type { IMetricRepository } from '../../domain/repositories/metric-repository.js';
import type {
  GetUserStreakStatusInputDTO,
  GetUserStreakStatusOutputDTO,
} from '../dtos/get-user-streak-status-dto.js';

/** UUIDv4 regex (ADR-0047 §6). */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Read-only use case: returns the current streak status for a user.
 *
 * ## No events dispatched
 *
 * This is a read-only operation — no domain events are emitted (ADR-0009 §3).
 *
 * ## Zero-state handling
 *
 * If no STREAK_DAYS metric has been computed yet for the user, returns
 * `currentStreak=0, longestStreak=0, streakStatus='NEVER_STARTED'`.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * `professionalProfileId` scopes all repository queries.
 */
export class GetUserStreakStatus {
  constructor(private readonly metricRepo: IMetricRepository) {}

  async execute(
    dto: GetUserStreakStatusInputDTO,
  ): Promise<DomainResult<GetUserStreakStatusOutputDTO>> {
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

    // 3. Query latest streak metric
    const metric = await this.metricRepo.findLatestStreakByUserId(
      dto.userId,
      dto.professionalProfileId,
    );

    // 4. Zero state — no metric computed yet
    if (metric === null) {
      return right({
        currentStreak: 0,
        longestStreak: 0,
        streakStatus: 'NEVER_STARTED',
        lastActivityDate: null,
      });
    }

    // 5. Return metric data
    // value = currentStreak (stored by ComputeStreakMetric)
    // logicalDay = anchor date (yesterdayStr at computation time)
    return right({
      currentStreak: metric.value,
      // ADR-0043 §3: Metric has a single `value` field. longestStreak is not stored separately;
      // it is approximated as the current stored value, which is sufficient for read-model display.
      // A future derivationRuleVersion can introduce a dedicated field if needed.
      longestStreak: metric.value,
      streakStatus: metric.value > 0 ? 'ACTIVE' : 'BROKEN',
      lastActivityDate: metric.logicalDay.value,
    });
  }
}
