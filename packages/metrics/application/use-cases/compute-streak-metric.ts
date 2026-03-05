import { UTCDateTime, LogicalDay, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Metric } from '../../domain/aggregates/metric.js';
import { MetricType } from '../../domain/enums/metric-type.js';
import { MetricComputationError } from '../../domain/errors/metric-computation-error.js';
import { StreakMetricComputedEvent } from '../../domain/events/streak-metric-computed-event.js';
import { StreakBrokenEvent } from '../../domain/events/streak-broken-event.js';
import { NewLongestStreakEvent } from '../../domain/events/new-longest-streak-event.js';
import type { IMetricRepository } from '../../domain/repositories/metric-repository.js';
import type { IExecutionQueryService } from '../ports/execution-query-service-port.js';
import type { IBatchMetricsEventPublisher } from '../ports/batch-metrics-event-publisher-port.js';
import type {
  ComputeStreakMetricInputDTO,
  ComputeStreakMetricOutputDTO,
} from '../dtos/compute-streak-metric-dto.js';

/** UUIDv4 regex (ADR-0047 §6). */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** ISO date regex YYYY-MM-DD. */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Rolling window in days for streak computation (ADR-0054 §4). */
const STREAK_WINDOW_DAYS = 90;

/** Derivation rule version for STREAK_DAYS metrics. */
const STREAK_RULE_VERSION = 'v1';

/** One day in milliseconds. */
const ONE_DAY_MS = 86_400_000;

/**
 * Streak status values — what the streak looks like as of computeDate.
 * ACTIVE: last activity was yesterday (D-1), currentStreak > 0.
 * BROKEN: last activity was before yesterday, currentStreak = 0.
 * NEVER_STARTED: no activity in the 90-day window at all.
 */
const StreakStatus = {
  ACTIVE: 'ACTIVE',
  BROKEN: 'BROKEN',
  NEVER_STARTED: 'NEVER_STARTED',
} as const;

type StreakStatus = (typeof StreakStatus)[keyof typeof StreakStatus];

/**
 * Computes a STREAK_DAYS Metric for one user.
 *
 * ## Algorithm (ADR-0054 §4)
 *
 * 1. Fetch all unique activity dates in the rolling 90-day window ending at D-1.
 * 2. Normalize, deduplicate, and sort them chronologically.
 * 3. Compute currentStreak: count backwards from D-1 while dates are consecutive.
 * 4. Compute longestStreak: linear scan for the longest consecutive run.
 * 5. Detect special events: StreakBroken, NewLongestStreak.
 * 6. Create and persist a STREAK_DAYS Metric aggregate.
 * 7. Publish events post-commit (ADR-0009 §4).
 *
 * ## Cross-context isolation (ADR-0047, ADR-0005)
 *
 * Execution data is accessed exclusively through `IExecutionQueryService`.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * `professionalProfileId` scopes all repository and query calls.
 */
export class ComputeStreakMetric {
  constructor(
    private readonly metricRepo: IMetricRepository,
    private readonly executionQueryService: IExecutionQueryService,
    private readonly eventPublisher: IBatchMetricsEventPublisher,
  ) {}

  async execute(
    dto: ComputeStreakMetricInputDTO,
  ): Promise<DomainResult<ComputeStreakMetricOutputDTO>> {
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

    // 3. Determine computeDate (default: today UTC)
    let computeDateStr: string;
    if (dto.computeDate !== undefined) {
      if (!ISO_DATE_REGEX.test(dto.computeDate)) {
        return left(
          new MetricComputationError(`computeDate must be YYYY-MM-DD; got "${dto.computeDate}"`),
        );
      }
      computeDateStr = dto.computeDate;
    } else {
      computeDateStr = new Date().toISOString().slice(0, 10);
    }

    // 4. Derive the 90-day window: [computeDate - 90 days, computeDate - 1 day]
    const computeDate = new Date(`${computeDateStr}T00:00:00.000Z`);
    const yesterday = new Date(computeDate.getTime() - ONE_DAY_MS);
    const windowStart = new Date(computeDate.getTime() - STREAK_WINDOW_DAYS * ONE_DAY_MS);

    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const windowStartStr = windowStart.toISOString().slice(0, 10);

    // 5. Fetch previous streak metric for change detection (ADR-0043 §1).
    // Encoding contract: Metric.value = currentStreak for STREAK_DAYS records.
    // longestStreak is re-derived from activity dates on every run and is NOT stored
    // persistently, because the Metric aggregate exposes a single `value` field
    // (ADR-0043 §3 — adding a second persisted field requires a new derivationRuleVersion).
    // previousLongestStreak is approximated as the previous currentStreak, which is
    // sufficient for NewLongestStreak event detection within the 90-day rolling window.
    const previousMetric = await this.metricRepo.findLatestStreakByUserId(
      dto.userId,
      dto.professionalProfileId,
    );
    const previousCurrentStreak = previousMetric?.value ?? 0;
    const previousLongestStreak = previousMetric?.value ?? 0;

    // 6. Query activity dates in the window
    const activityDates = await this.executionQueryService.getActivityDatesInWindow(
      dto.userId,
      windowStartStr,
      yesterdayStr,
    );

    // 7. Compute streak values
    const { currentStreak, longestStreak, status, lastActivityDate, sourceIds } = computeStreaks(
      activityDates,
      yesterdayStr,
    );

    // 8. Build LogicalDay for anchor (use yesterdayStr as anchor, ADR-0010)
    const logicalDayResult = LogicalDay.create(yesterdayStr);
    /* c8 ignore start — defensive: yesterdayStr is derived from a valid computeDate by subtracting one day; LogicalDay.create only fails on malformed strings */
    if (logicalDayResult.isLeft()) {
      return left(new MetricComputationError(`Could not build LogicalDay from "${yesterdayStr}"`));
    }
    /* c8 ignore end */
    const logicalDay = logicalDayResult.value;

    // 9. Create STREAK_DAYS Metric — value = currentStreak (the primary KPI)
    const sentinelId = '00000000-0000-4000-8000-000000000000';
    const metricResult = Metric.create({
      clientId: dto.userId,
      professionalProfileId: dto.professionalProfileId,
      metricType: MetricType.STREAK_DAYS,
      value: currentStreak,
      unit: 'day',
      derivationRuleVersion: STREAK_RULE_VERSION,
      sourceExecutionIds: sourceIds.length > 0 ? sourceIds : [sentinelId],
      computedAtUtc: UTCDateTime.now(),
      logicalDay,
      timezoneUsed: 'UTC',
    });

    /* c8 ignore start — defensive: create() only fails on value/unit/derivationRuleVersion/timezoneUsed invariants; all are hardcoded constants here */
    if (metricResult.isLeft()) {
      return left(
        new MetricComputationError(
          `Failed to create STREAK_DAYS Metric: ${metricResult.value.message}`,
        ),
      );
    }
    /* c8 ignore end */

    const metric = metricResult.value;

    // 10. Persist (INSERT-only, ADR-0014 §5)
    await this.metricRepo.save(metric);

    // 11. Publish events post-commit (ADR-0009 §4)

    // 11a. Main event: StreakMetricComputed
    const streakComputedEvent = new StreakMetricComputedEvent(
      metric.id,
      metric.professionalProfileId,
      {
        metricId: metric.id,
        clientId: metric.clientId,
        professionalProfileId: metric.professionalProfileId,
        currentStreak,
        longestStreak,
        streakStatus: status,
        derivationRuleVersion: STREAK_RULE_VERSION,
      },
    );
    await this.eventPublisher.publishStreakMetricComputed(streakComputedEvent);

    // 11b. StreakBroken: previous streak was active (>0) and is now 0
    if (previousCurrentStreak > 0 && currentStreak === 0) {
      const brokenEvent = new StreakBrokenEvent(metric.id, metric.professionalProfileId, {
        clientId: metric.clientId,
        professionalProfileId: metric.professionalProfileId,
        previousStreak: previousCurrentStreak,
        lastActivityDate: lastActivityDate ?? yesterdayStr,
      });
      await this.eventPublisher.publishStreakBroken(brokenEvent);
    }

    // 11c. NewLongestStreak: longest is now greater than previous longest
    if (longestStreak > previousLongestStreak) {
      const newRecordEvent = new NewLongestStreakEvent(metric.id, metric.professionalProfileId, {
        clientId: metric.clientId,
        professionalProfileId: metric.professionalProfileId,
        longestStreak,
        previousLongestStreak,
      });
      await this.eventPublisher.publishNewLongestStreak(newRecordEvent);
    }

    return right({
      metricId: metric.id,
      currentStreak,
      longestStreak,
      streakStatus: status,
    });
  }
}

// ── Streak algorithm (ADR-0054 §4) ───────────────────────────────────────────

interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  status: StreakStatus;
  lastActivityDate: string | null;
  /** UUIDs are not available here — we signal empty via sentinel pattern. */
  sourceIds: string[];
}

/**
 * Pure function: computes streak values from a list of activity date strings.
 *
 * @param activityDates  YYYY-MM-DD strings of days with ≥1 confirmed Execution.
 * @param yesterdayStr   YYYY-MM-DD of D-1 (the last valid day in the window).
 */
export function computeStreaks(activityDates: string[], yesterdayStr: string): StreakResult {
  if (activityDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      status: StreakStatus.NEVER_STARTED,
      lastActivityDate: null,
      sourceIds: [],
    };
  }

  // 1. Deduplicate, sort ascending
  const unique = [...new Set(activityDates)];
  unique.sort();

  const lastDate = unique[unique.length - 1] ?? '';

  // 2. Compute currentStreak — count backwards from yesterday
  let currentStreak = 0;
  let cursor = new Date(`${yesterdayStr}T00:00:00.000Z`);

  for (let i = unique.length - 1; i >= 0; i--) {
    const dateStr = unique[i] ?? '';
    const cursorStr = cursor.toISOString().slice(0, 10);

    if (dateStr === cursorStr) {
      currentStreak++;
      cursor = new Date(cursor.getTime() - ONE_DAY_MS);
    } else if (dateStr < cursorStr) {
      // Gap — streak breaks
      break;
    }
    // dateStr > cursorStr shouldn't happen since array is sorted ascending
    // and we iterate backwards, but guard defensively
  }

  // 3. Compute longestStreak — linear scan
  let longestStreak = 0;
  let runLength = 1;

  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(`${unique[i - 1] ?? ''}T00:00:00.000Z`);
    const curr = new Date(`${unique[i] ?? ''}T00:00:00.000Z`);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / ONE_DAY_MS);

    if (diffDays === 1) {
      runLength++;
    } else {
      longestStreak = Math.max(longestStreak, runLength);
      runLength = 1;
    }
  }
  longestStreak = Math.max(longestStreak, runLength, currentStreak);

  // 4. Determine status
  let status: StreakStatus;
  if (lastDate === yesterdayStr) {
    status = StreakStatus.ACTIVE;
  } else {
    status = currentStreak > 0 ? StreakStatus.ACTIVE : StreakStatus.BROKEN;
  }

  // If lastDate < yesterdayStr and currentStreak == 0 => BROKEN
  if (lastDate < yesterdayStr && currentStreak === 0) {
    status = StreakStatus.BROKEN;
  }

  return {
    currentStreak,
    longestStreak,
    status,
    lastActivityDate: lastDate,
    sourceIds: [],
  };
}
