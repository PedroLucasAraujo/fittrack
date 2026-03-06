import type { AchievementDefinitionCreatedEvent } from '../../domain/events/achievement-definition-created-event.js';
import type { AchievementDefinitionActivatedEvent } from '../../domain/events/achievement-definition-activated-event.js';
import type { AchievementUnlockedEvent } from '../../domain/events/achievement-unlocked-event.js';
import type { AchievementProgressUpdatedEvent } from '../../domain/events/achievement-progress-updated-event.js';

/**
 * Port for publishing achievements domain events (ADR-0009 §4).
 * Infrastructure implements this with the actual event bus (Redis, RabbitMQ, etc.).
 */
export interface IAchievementEventPublisher {
  publishAchievementDefinitionCreated(event: AchievementDefinitionCreatedEvent): Promise<void>;
  publishAchievementDefinitionActivated(event: AchievementDefinitionActivatedEvent): Promise<void>;
  publishAchievementUnlocked(event: AchievementUnlockedEvent): Promise<void>;
  publishAchievementProgressUpdated(event: AchievementProgressUpdatedEvent): Promise<void>;
}
