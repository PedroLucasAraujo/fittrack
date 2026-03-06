import type { IAchievementEventPublisher } from '../../application/ports/i-achievement-event-publisher.js';
import type { AchievementDefinitionCreatedEvent } from '../../domain/events/achievement-definition-created-event.js';
import type { AchievementDefinitionActivatedEvent } from '../../domain/events/achievement-definition-activated-event.js';
import type { AchievementUnlockedEvent } from '../../domain/events/achievement-unlocked-event.js';
import type { AchievementProgressUpdatedEvent } from '../../domain/events/achievement-progress-updated-event.js';

export class InMemoryAchievementEventPublisherStub implements IAchievementEventPublisher {
  definitionCreatedEvents: AchievementDefinitionCreatedEvent[] = [];
  definitionActivatedEvents: AchievementDefinitionActivatedEvent[] = [];
  unlockedEvents: AchievementUnlockedEvent[] = [];
  progressUpdatedEvents: AchievementProgressUpdatedEvent[] = [];

  async publishAchievementDefinitionCreated(
    event: AchievementDefinitionCreatedEvent,
  ): Promise<void> {
    this.definitionCreatedEvents.push(event);
  }

  async publishAchievementDefinitionActivated(
    event: AchievementDefinitionActivatedEvent,
  ): Promise<void> {
    this.definitionActivatedEvents.push(event);
  }

  async publishAchievementUnlocked(event: AchievementUnlockedEvent): Promise<void> {
    this.unlockedEvents.push(event);
  }

  async publishAchievementProgressUpdated(event: AchievementProgressUpdatedEvent): Promise<void> {
    this.progressUpdatedEvents.push(event);
  }
}
