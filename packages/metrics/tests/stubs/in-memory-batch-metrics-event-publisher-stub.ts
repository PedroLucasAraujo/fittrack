import type { IBatchMetricsEventPublisher } from '../../application/ports/batch-metrics-event-publisher-port.js';
import type { WeeklyVolumeMetricComputedEvent } from '../../domain/events/weekly-volume-metric-computed-event.js';
import type { StreakMetricComputedEvent } from '../../domain/events/streak-metric-computed-event.js';
import type { StreakBrokenEvent } from '../../domain/events/streak-broken-event.js';
import type { NewLongestStreakEvent } from '../../domain/events/new-longest-streak-event.js';

export class InMemoryBatchMetricsEventPublisherStub implements IBatchMetricsEventPublisher {
  public publishedWeeklyVolumeMetricComputed: WeeklyVolumeMetricComputedEvent[] = [];
  public publishedStreakMetricComputed: StreakMetricComputedEvent[] = [];
  public publishedStreakBroken: StreakBrokenEvent[] = [];
  public publishedNewLongestStreak: NewLongestStreakEvent[] = [];

  async publishWeeklyVolumeMetricComputed(event: WeeklyVolumeMetricComputedEvent): Promise<void> {
    this.publishedWeeklyVolumeMetricComputed.push(event);
  }

  async publishStreakMetricComputed(event: StreakMetricComputedEvent): Promise<void> {
    this.publishedStreakMetricComputed.push(event);
  }

  async publishStreakBroken(event: StreakBrokenEvent): Promise<void> {
    this.publishedStreakBroken.push(event);
  }

  async publishNewLongestStreak(event: NewLongestStreakEvent): Promise<void> {
    this.publishedNewLongestStreak.push(event);
  }
}
