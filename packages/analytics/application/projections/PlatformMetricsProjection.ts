import type { EngagementScoreCalculatedEvent } from '@fittrack/engagement';
import type { IPlatformMetricsReadModel } from '../read-models/IPlatformMetricsReadModel.js';

/**
 * Projection handler for the platform_metrics read model.
 *
 * Handles:
 * - EngagementScoreCalculatedEvent → increment DAU counters and level distribution
 */
export class PlatformMetricsProjection {
  constructor(
    private readonly readModel: IPlatformMetricsReadModel,
  ) {}

  async onEngagementScoreCalculated(event: EngagementScoreCalculatedEvent): Promise<void> {
    const p = event.payload;
    const metricDate = p.calculatedAtUtc.slice(0, 10); // YYYY-MM-DD

    await this.readModel.incrementCounters({
      metricDate,
      engagementLevel: p.engagementLevel,
      isAtRisk: p.isAtRisk,
      overallScore: p.overallScore,
      calculatedAtUtc: p.calculatedAtUtc,
    });
  }
}
