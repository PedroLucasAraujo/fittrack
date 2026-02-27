export const MetricErrorCodes = {
  METRIC_INVALID: 'METRICS.METRIC_INVALID',
} as const;

export type MetricErrorCode = (typeof MetricErrorCodes)[keyof typeof MetricErrorCodes];
