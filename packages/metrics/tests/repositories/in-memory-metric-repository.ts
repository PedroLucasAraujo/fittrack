import type { LogicalDay } from '@fittrack/core';
import type { IMetricRepository } from '../../domain/repositories/metric-repository.js';
import type { Metric } from '../../domain/aggregates/metric.js';
import type { MetricType } from '../../domain/enums/metric-type.js';

export class InMemoryMetricRepository implements IMetricRepository {
  items: Metric[] = [];
  saveCount = 0;

  async save(metric: Metric): Promise<void> {
    this.saveCount++;
    this.items.push(metric);
  }

  async findById(id: string, professionalProfileId: string): Promise<Metric | null> {
    return (
      this.items.find((m) => m.id === id && m.professionalProfileId === professionalProfileId) ??
      null
    );
  }

  async findBySourceExecutionIdAndType(
    executionId: string,
    metricType: MetricType,
    professionalProfileId: string,
  ): Promise<Metric | null> {
    return (
      this.items.find(
        (m) =>
          m.sourceExecutionIds.includes(executionId) &&
          m.metricType === metricType &&
          m.professionalProfileId === professionalProfileId,
      ) ?? null
    );
  }

  async findByClientAndLogicalDay(
    clientId: string,
    logicalDay: LogicalDay,
    professionalProfileId: string,
  ): Promise<Metric[]> {
    return this.items.filter(
      (m) =>
        m.clientId === clientId &&
        m.logicalDay.value === logicalDay.value &&
        m.professionalProfileId === professionalProfileId,
    );
  }

  async findByClientAndDateRange(
    clientId: string,
    from: LogicalDay,
    to: LogicalDay,
    professionalProfileId: string,
  ): Promise<Metric[]> {
    return this.items.filter(
      (m) =>
        m.clientId === clientId &&
        m.logicalDay.value >= from.value &&
        m.logicalDay.value <= to.value &&
        m.professionalProfileId === professionalProfileId,
    );
  }
}
