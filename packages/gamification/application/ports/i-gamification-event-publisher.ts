import type { StreakIncrementedEvent } from '../../domain/events/streak-incremented-event.js';
import type { StreakBrokenEvent } from '../../domain/events/streak-broken-event.js';
import type { FreezeTokenEarnedEvent } from '../../domain/events/freeze-token-earned-event.js';
import type { FreezeTokenUsedEvent } from '../../domain/events/freeze-token-used-event.js';
import type { StreakIntegrityViolationEvent } from '../../domain/events/streak-integrity-violation-event.js';

/**
 * Port for publishing gamification domain events to the event bus (ADR-0009 §4).
 *
 * The infrastructure adapter implements this interface. The Application layer
 * depends only on this abstraction — never on a concrete message broker.
 */
export interface IGamificationEventPublisher {
  publishStreakIncremented(event: StreakIncrementedEvent): Promise<void>;
  publishStreakBroken(event: StreakBrokenEvent): Promise<void>;
  publishFreezeTokenEarned(event: FreezeTokenEarnedEvent): Promise<void>;
  publishFreezeTokenUsed(event: FreezeTokenUsedEvent): Promise<void>;
  publishStreakIntegrityViolation(event: StreakIntegrityViolationEvent): Promise<void>;
}
