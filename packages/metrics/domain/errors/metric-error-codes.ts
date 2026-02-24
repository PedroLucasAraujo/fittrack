export const MetricErrorCodes = {
  INVALID_METRIC: 'METRICS.INVALID_METRIC',
} as const;

export type MetricErrorCode = (typeof MetricErrorCodes)[keyof typeof MetricErrorCodes];
