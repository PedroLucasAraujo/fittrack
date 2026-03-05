import type { WeeklyVolumeMetricComputedEvent } from '../../domain/events/weekly-volume-metric-computed-event.js';
import type { StreakMetricComputedEvent } from '../../domain/events/streak-metric-computed-event.js';
import type { StreakBrokenEvent } from '../../domain/events/streak-broken-event.js';
import type { NewLongestStreakEvent } from '../../domain/events/new-longest-streak-event.js';

/**
 * Port for publishing batch metric computation domain events post-commit (ADR-0009 §4).
 *
 * Separate from IMetricsEventPublisher to allow different infrastructure
 * adapters for batch vs event-driven pipelines.
 */
export interface IBatchMetricsEventPublisher {
  publishWeeklyVolumeMetricComputed(event: WeeklyVolumeMetricComputedEvent): Promise<void>;
  publishStreakMetricComputed(event: StreakMetricComputedEvent): Promise<void>;
  publishStreakBroken(event: StreakBrokenEvent): Promise<void>;
  publishNewLongestStreak(event: NewLongestStreakEvent): Promise<void>;
}
