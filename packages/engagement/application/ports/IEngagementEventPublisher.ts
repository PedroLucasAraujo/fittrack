import type { EngagementScoreCalculatedEvent } from '../../domain/events/EngagementScoreCalculatedEvent.js';
import type { UserDisengagedEvent } from '../../domain/events/UserDisengagedEvent.js';
import type { EngagementImprovedEvent } from '../../domain/events/EngagementImprovedEvent.js';

/**
 * Port for publishing Engagement domain events (ADR-0047 §4).
 *
 * Implemented in the infrastructure layer (e.g., in-process event bus,
 * outbox pattern for at-least-once delivery per ADR-0016).
 * One method per event type for type safety.
 */
export interface IEngagementEventPublisher {
  publishEngagementScoreCalculated(event: EngagementScoreCalculatedEvent): Promise<void>;
  publishUserDisengaged(event: UserDisengagedEvent): Promise<void>;
  publishEngagementImproved(event: EngagementImprovedEvent): Promise<void>;
}
