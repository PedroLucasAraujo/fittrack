// ── Enums ─────────────────────────────────────────────────────────────────────
export { MetricType } from './domain/enums/metric-type.js';
export type { MetricType as MetricTypeValue } from './domain/enums/metric-type.js';

// ── Errors ────────────────────────────────────────────────────────────────────
export { MetricErrorCodes } from './domain/errors/metric-error-codes.js';
export type { MetricErrorCode } from './domain/errors/metric-error-codes.js';
export { InvalidMetricError } from './domain/errors/invalid-metric-error.js';
export { MetricComputationError } from './domain/errors/metric-computation-error.js';
export { InvalidWeekStartDateError } from './domain/errors/invalid-week-start-date-error.js';

// ── Aggregates ────────────────────────────────────────────────────────────────
export { Metric } from './domain/aggregates/metric.js';
export type { MetricProps } from './domain/aggregates/metric.js';

// ── Domain Events ─────────────────────────────────────────────────────────────
export { MetricComputedEvent } from './domain/events/metric-computed-event.js';
export type { MetricComputedPayload } from './domain/events/metric-computed-event.js';
export { WeeklyVolumeMetricComputedEvent } from './domain/events/weekly-volume-metric-computed-event.js';
export type { WeeklyVolumeMetricComputedPayload } from './domain/events/weekly-volume-metric-computed-event.js';
export { StreakMetricComputedEvent } from './domain/events/streak-metric-computed-event.js';
export type { StreakMetricComputedPayload } from './domain/events/streak-metric-computed-event.js';
export { StreakBrokenEvent } from './domain/events/streak-broken-event.js';
export type { StreakBrokenPayload } from './domain/events/streak-broken-event.js';
export { NewLongestStreakEvent } from './domain/events/new-longest-streak-event.js';
export type { NewLongestStreakPayload } from './domain/events/new-longest-streak-event.js';

// ── Repositories ──────────────────────────────────────────────────────────────
export type { IMetricRepository, UserTenantPair } from './domain/repositories/metric-repository.js';

// ── Application Ports ─────────────────────────────────────────────────────────
export type { IMetricsEventPublisher } from './application/ports/metrics-event-publisher-port.js';
export type { IBatchMetricsEventPublisher } from './application/ports/batch-metrics-event-publisher-port.js';
export type {
  IExecutionQueryService,
  ExecutionSummary,
} from './application/ports/execution-query-service-port.js';

// ── Application DTOs ──────────────────────────────────────────────────────────
export type {
  ComputeWeeklyVolumeMetricInputDTO,
  ComputeWeeklyVolumeMetricOutputDTO,
} from './application/dtos/compute-weekly-volume-metric-dto.js';
export type {
  ComputeStreakMetricInputDTO,
  ComputeStreakMetricOutputDTO,
} from './application/dtos/compute-streak-metric-dto.js';
export type {
  GetUserWeeklyVolumeHistoryInputDTO,
  GetUserWeeklyVolumeHistoryOutputDTO,
  WeeklyVolumeHistoryEntry,
} from './application/dtos/get-user-weekly-volume-history-dto.js';
export type {
  GetUserStreakStatusInputDTO,
  GetUserStreakStatusOutputDTO,
} from './application/dtos/get-user-streak-status-dto.js';

// ── Use Cases ─────────────────────────────────────────────────────────────────
export { DeriveExecutionMetrics } from './application/use-cases/derive-execution-metrics.js';
export { HandleExecutionCorrection } from './application/use-cases/handle-execution-correction.js';
export { ComputeWeeklyVolumeMetric } from './application/use-cases/compute-weekly-volume-metric.js';
export {
  ComputeStreakMetric,
  computeStreaks,
} from './application/use-cases/compute-streak-metric.js';
export { GetUserWeeklyVolumeHistory } from './application/use-cases/get-user-weekly-volume-history.js';
export { GetUserStreakStatus } from './application/use-cases/get-user-streak-status.js';

// ── Jobs ─────────────────────────────────────────────────────────────────────
export { ComputeWeeklyVolumeMetricsJob } from './jobs/ComputeWeeklyVolumeMetricsJob.js';
export { ComputeStreakDaysMetricsJob } from './jobs/ComputeStreakDaysMetricsJob.js';

// ── Job Infrastructure ────────────────────────────────────────────────────────
export type { IScheduledJob } from './shared/jobs/IScheduledJob.js';
export { JobResult } from './shared/jobs/JobResult.js';
