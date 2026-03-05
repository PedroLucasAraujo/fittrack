import type { LogicalDay } from '@fittrack/core';
import type {
  IMetricRepository,
  UserTenantPair,
} from '../../domain/repositories/metric-repository.js';
import type { Metric } from '../../domain/aggregates/metric.js';
import type { MetricType } from '../../domain/enums/metric-type.js';

export class InMemoryMetricRepository implements IMetricRepository {
  items: Metric[] = [];
  saveCount = 0;

  /** Configurable list of (userId, professionalProfileId) pairs returned by findUsersToComputeWeeklyVolume. */
  usersToComputeWeekly: UserTenantPair[] = [];
  /** Configurable list of (userId, professionalProfileId) pairs returned by findUsersToComputeStreak. */
  usersToComputeStreak: UserTenantPair[] = [];

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

  // ── Batch computation methods ─────────────────────────────────────────────

  async findByUserAndWeekStart(
    userId: string,
    weekStartDate: string,
    professionalProfileId: string,
  ): Promise<Metric | null> {
    return (
      this.items.find(
        (m) =>
          m.clientId === userId &&
          m.logicalDay.value === weekStartDate &&
          m.professionalProfileId === professionalProfileId,
      ) ?? null
    );
  }

  async findByUserLastNWeeks(
    userId: string,
    lastNWeeks: number,
    professionalProfileId: string,
  ): Promise<Metric[]> {
    return this.items
      .filter((m) => m.clientId === userId && m.professionalProfileId === professionalProfileId)
      .sort((a, b) => (a.logicalDay.value > b.logicalDay.value ? -1 : 1))
      .slice(0, lastNWeeks);
  }

  async findLatestStreakByUserId(
    userId: string,
    professionalProfileId: string,
  ): Promise<Metric | null> {
    const streakMetrics = this.items
      .filter(
        (m) =>
          m.clientId === userId &&
          m.professionalProfileId === professionalProfileId &&
          m.metricType === 'STREAK_DAYS',
      )
      .sort((a, b) => (a.logicalDay.value > b.logicalDay.value ? -1 : 1));

    return streakMetrics[0] ?? null;
  }

  async findUsersToComputeWeeklyVolume(
    _weekStartDate: string,
    _weekEndDate: string,
  ): Promise<UserTenantPair[]> {
    return [...this.usersToComputeWeekly];
  }

  async findUsersToComputeStreak(_since: string): Promise<UserTenantPair[]> {
    return [...this.usersToComputeStreak];
  }
}
