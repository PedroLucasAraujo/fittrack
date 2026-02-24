// ── Enums ─────────────────────────────────────────────────────────────────────
export { MetricType } from './domain/enums/metric-type.js';
export type { MetricType as MetricTypeValue } from './domain/enums/metric-type.js';

// ── Errors ────────────────────────────────────────────────────────────────────
export { MetricErrorCodes } from './domain/errors/metric-error-codes.js';
export type { MetricErrorCode } from './domain/errors/metric-error-codes.js';
export { InvalidMetricError } from './domain/errors/invalid-metric-error.js';

// ── Aggregates ────────────────────────────────────────────────────────────────
export { Metric } from './domain/aggregates/metric.js';
export type { MetricProps } from './domain/aggregates/metric.js';

// ── Domain Events ─────────────────────────────────────────────────────────────
export { MetricComputedEvent } from './domain/events/metric-computed-event.js';
export type { MetricComputedPayload } from './domain/events/metric-computed-event.js';

// ── Repositories ──────────────────────────────────────────────────────────────
export type { IMetricRepository } from './domain/repositories/metric-repository.js';

// ── Application Ports ─────────────────────────────────────────────────────────
export type { IMetricsEventPublisher } from './application/ports/metrics-event-publisher-port.js';

// ── Use Cases ─────────────────────────────────────────────────────────────────
export { DeriveExecutionMetrics } from './application/use-cases/derive-execution-metrics.js';
export { HandleExecutionCorrection } from './application/use-cases/handle-execution-correction.js';
