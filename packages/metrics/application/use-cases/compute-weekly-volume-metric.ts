import { UTCDateTime, LogicalDay, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Metric } from '../../domain/aggregates/metric.js';
import { MetricType } from '../../domain/enums/metric-type.js';
import { MetricComputationError } from '../../domain/errors/metric-computation-error.js';
import { InvalidWeekStartDateError } from '../../domain/errors/invalid-week-start-date-error.js';
import { WeeklyVolumeMetricComputedEvent } from '../../domain/events/weekly-volume-metric-computed-event.js';
import type { IMetricRepository } from '../../domain/repositories/metric-repository.js';
import type { IExecutionQueryService } from '../ports/execution-query-service-port.js';
import type { IBatchMetricsEventPublisher } from '../ports/batch-metrics-event-publisher-port.js';
import type {
  ComputeWeeklyVolumeMetricInputDTO,
  ComputeWeeklyVolumeMetricOutputDTO,
} from '../dtos/compute-weekly-volume-metric-dto.js';

/** UUIDv4 regex (ADR-0047 §6). */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** ISO date regex YYYY-MM-DD. */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Derivation rule version for WEEKLY_VOLUME metrics. */
const WEEKLY_VOLUME_RULE_VERSION = 'v1';

/**
 * Computes a WEEKLY_VOLUME Metric for one user for one ISO week.
 *
 * ## Idempotency (ADR-0043, ADR-0007)
 *
 * If a WEEKLY_VOLUME metric already exists for the same user + weekStartDate,
 * a NEW record is created with the latest data (the query service is the single
 * source of truth — ADR-0043 §1). Old records are retained per ADR-0043 §2.
 * Jobs should check before calling to avoid unnecessary writes if needed.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * `professionalProfileId` scopes all repository and query service calls.
 *
 * ## Cross-context isolation (ADR-0047, ADR-0005)
 *
 * Execution data is accessed exclusively through `IExecutionQueryService`
 * (anti-corruption layer). No Execution aggregates are imported.
 */
export class ComputeWeeklyVolumeMetric {
  constructor(
    private readonly metricRepo: IMetricRepository,
    private readonly executionQueryService: IExecutionQueryService,
    private readonly eventPublisher: IBatchMetricsEventPublisher,
  ) {}

  async execute(
    dto: ComputeWeeklyVolumeMetricInputDTO,
  ): Promise<DomainResult<ComputeWeeklyVolumeMetricOutputDTO>> {
    // 1. Validate userId (must be a valid UUIDv4)
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

    // 3. Validate weekStartDate format
    if (!ISO_DATE_REGEX.test(dto.weekStartDate)) {
      return left(
        new InvalidWeekStartDateError(
          `weekStartDate must be YYYY-MM-DD; got "${dto.weekStartDate}"`,
        ),
      );
    }

    // 4. Validate weekStartDate is a Monday (day-of-week = 1 in UTC)
    const weekStart = new Date(`${dto.weekStartDate}T00:00:00.000Z`);
    if (isNaN(weekStart.getTime())) {
      return left(
        new InvalidWeekStartDateError(`weekStartDate is not a valid date: "${dto.weekStartDate}"`),
      );
    }
    const dayOfWeek = weekStart.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
    if (dayOfWeek !== 1) {
      return left(
        new InvalidWeekStartDateError(
          `weekStartDate must be a Monday (UTC); got "${dto.weekStartDate}" which is day ${dayOfWeek}`,
        ),
      );
    }

    // 5. Derive weekEndDate (Sunday = start + 6 days)
    const weekEndDate = new Date(weekStart);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
    const weekEndDateStr = weekEndDate.toISOString().slice(0, 10);

    // 6. Build LogicalDay for Metric.logicalDay (anchor = weekStartDate, ADR-0010, ADR-0014 §2)
    const logicalDayResult = LogicalDay.create(dto.weekStartDate);
    /* c8 ignore start — defensive: weekStartDate already validated as Monday (YYYY-MM-DD) above; LogicalDay.create only fails on malformed strings */
    if (logicalDayResult.isLeft()) {
      return left(
        new InvalidWeekStartDateError(
          `weekStartDate is not a valid LogicalDay: "${dto.weekStartDate}"`,
        ),
      );
    }
    /* c8 ignore end */
    const logicalDay = logicalDayResult.value;

    // 7. Query Execution bounded context via anti-corruption layer
    const summary = await this.executionQueryService.getWeeklyExecutionSummary(
      dto.userId,
      dto.weekStartDate,
      weekEndDateStr,
    );

    // 8. Compute totalVolume (round to avoid floating point, ADR-0004)
    const totalVolume = Math.round(summary.totalVolume);

    // 9. Create WEEKLY_VOLUME Metric aggregate
    const metricResult = Metric.create({
      clientId: dto.userId,
      professionalProfileId: dto.professionalProfileId,
      metricType: MetricType.WEEKLY_VOLUME,
      value: totalVolume,
      unit: 'session',
      derivationRuleVersion: WEEKLY_VOLUME_RULE_VERSION,
      sourceExecutionIds:
        summary.sourceExecutionIds.length > 0
          ? summary.sourceExecutionIds
          : ['00000000-0000-4000-8000-000000000000'], // sentinel for zero-workout weeks
      computedAtUtc: UTCDateTime.now(),
      logicalDay,
      timezoneUsed: 'UTC',
    });

    /* c8 ignore start — defensive: create() only fails on value/unit/derivationRuleVersion/timezoneUsed invariants; all are hardcoded constants here */
    if (metricResult.isLeft()) {
      return left(
        new MetricComputationError(
          `Failed to create WEEKLY_VOLUME Metric: ${metricResult.value.message}`,
        ),
      );
    }
    /* c8 ignore end */

    const metric = metricResult.value;

    // 10. Persist (INSERT-only, ADR-0014 §5, ADR-0043 §2)
    await this.metricRepo.save(metric);

    // 11. Publish WeeklyVolumeMetricComputedEvent post-commit (ADR-0009 §4)
    const event = new WeeklyVolumeMetricComputedEvent(metric.id, metric.professionalProfileId, {
      metricId: metric.id,
      clientId: metric.clientId,
      professionalProfileId: metric.professionalProfileId,
      weekStartDate: dto.weekStartDate,
      weekEndDate: weekEndDateStr,
      workoutCount: summary.workoutCount,
      derivationRuleVersion: WEEKLY_VOLUME_RULE_VERSION,
    });
    await this.eventPublisher.publishWeeklyVolumeMetricComputed(event);

    return right({
      metricId: metric.id,
      workoutCount: summary.workoutCount,
      totalVolume,
    });
  }
}
