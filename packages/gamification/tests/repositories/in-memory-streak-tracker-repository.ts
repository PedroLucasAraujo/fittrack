import type { IStreakTrackerRepository } from '../../domain/repositories/i-streak-tracker-repository.js';
import type { StreakTracker } from '../../domain/aggregates/streak-tracker.js';

export class InMemoryStreakTrackerRepository implements IStreakTrackerRepository {
  items: StreakTracker[] = [];
  saveCount = 0;

  async save(tracker: StreakTracker): Promise<void> {
    this.saveCount++;
    const idx = this.items.findIndex((t) => t.id === tracker.id);
    if (idx >= 0) {
      this.items[idx] = tracker;
    } else {
      this.items.push(tracker);
    }
  }

  async findByUserId(userId: string): Promise<StreakTracker | null> {
    return this.items.find((t) => t.userId === userId) ?? null;
  }

  async findAllActive(): Promise<StreakTracker[]> {
    return this.items.filter((t) => t.currentStreak > 0);
  }
}
