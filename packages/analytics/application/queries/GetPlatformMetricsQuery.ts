import type { DomainResult } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import type {
  IPlatformMetricsReadModel,
  PlatformMetricsDTO,
} from '../read-models/IPlatformMetricsReadModel.js';

class PlatformMetricsNotFoundError extends DomainError {
  constructor(date: string) {
    super(
      `Platform metrics not found for date ${date}`,
      'ANALYTICS.PLATFORM_METRICS_NOT_FOUND' as unknown as ErrorCode,
      { date },
    );
  }
}

export interface GetPlatformMetricsInput {
  /** Specific date (YYYY-MM-DD) for single-day query. */
  date?: string;
  /** Start of date range (YYYY-MM-DD). Used when date is not provided. */
  startDate?: string;
  /** End of date range (YYYY-MM-DD). Used when date is not provided. */
  endDate?: string;
}

export interface GetPlatformMetricsOutput {
  metrics: PlatformMetricsDTO[];
}

/**
 * Query handler for platform-level engagement metrics.
 *
 * Supports both single-date and date-range queries.
 * Admin-only: not tenant-scoped.
 */
export class GetPlatformMetricsQuery {
  constructor(private readonly readModel: IPlatformMetricsReadModel) {}

  async execute(input: GetPlatformMetricsInput): Promise<DomainResult<GetPlatformMetricsOutput>> {
    if (input.date) {
      const row = await this.readModel.findByDate(input.date);
      if (!row) {
        return left(new PlatformMetricsNotFoundError(input.date));
      }
      return right({ metrics: [row] });
    }

    const startDate = input.startDate ?? '';
    const endDate = input.endDate ?? '';
    const rows = await this.readModel.findDateRange(startDate, endDate);
    return right({ metrics: rows });
  }
}
