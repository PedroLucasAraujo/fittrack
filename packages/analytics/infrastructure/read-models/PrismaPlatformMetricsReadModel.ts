import type {
  IPlatformMetricsReadModel,
  PlatformMetricsDTO,
  IncrementPlatformCountersInput,
} from '../../application/read-models/IPlatformMetricsReadModel.js';

/**
 * Prisma implementation of the platform metrics read model.
 *
 * TODO: Inject PrismaClient and implement queries against platform_metrics table.
 */
export class PrismaPlatformMetricsReadModel implements IPlatformMetricsReadModel {
  findByDate(_date: string): Promise<PlatformMetricsDTO | null> {
    throw new Error('PrismaPlatformMetricsReadModel.findByDate not implemented');
  }

  findDateRange(_startDate: string, _endDate: string): Promise<PlatformMetricsDTO[]> {
    throw new Error('PrismaPlatformMetricsReadModel.findDateRange not implemented');
  }

  incrementCounters(_input: IncrementPlatformCountersInput): Promise<void> {
    throw new Error('PrismaPlatformMetricsReadModel.incrementCounters not implemented');
  }
}
