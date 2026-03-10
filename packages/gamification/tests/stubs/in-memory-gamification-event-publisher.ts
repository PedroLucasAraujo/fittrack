import type { IGamificationEventPublisher } from '../../application/ports/i-gamification-event-publisher.js';
import type { StreakIncrementedEvent } from '../../domain/events/streak-incremented-event.js';
import type { StreakBrokenEvent } from '../../domain/events/streak-broken-event.js';
import type { FreezeTokenEarnedEvent } from '../../domain/events/freeze-token-earned-event.js';
import type { FreezeTokenUsedEvent } from '../../domain/events/freeze-token-used-event.js';
import type { StreakIntegrityViolationEvent } from '../../domain/events/streak-integrity-violation-event.js';

export class InMemoryGamificationEventPublisher implements IGamificationEventPublisher {
  streakIncrementedEvents: StreakIncrementedEvent[] = [];
  streakBrokenEvents: StreakBrokenEvent[] = [];
  freezeTokenEarnedEvents: FreezeTokenEarnedEvent[] = [];
  freezeTokenUsedEvents: FreezeTokenUsedEvent[] = [];
  integrityViolationEvents: StreakIntegrityViolationEvent[] = [];

  async publishStreakIncremented(event: StreakIncrementedEvent): Promise<void> {
    this.streakIncrementedEvents.push(event);
  }

  async publishStreakBroken(event: StreakBrokenEvent): Promise<void> {
    this.streakBrokenEvents.push(event);
  }

  async publishFreezeTokenEarned(event: FreezeTokenEarnedEvent): Promise<void> {
    this.freezeTokenEarnedEvents.push(event);
  }

  async publishFreezeTokenUsed(event: FreezeTokenUsedEvent): Promise<void> {
    this.freezeTokenUsedEvents.push(event);
  }

  async publishStreakIntegrityViolation(event: StreakIntegrityViolationEvent): Promise<void> {
    this.integrityViolationEvents.push(event);
  }
}
