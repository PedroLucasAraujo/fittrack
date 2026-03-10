import type { ChallengeCreatedEvent } from '../../domain/events/challenge-created-event.js';
import type { ChallengeStartedEvent } from '../../domain/events/challenge-started-event.js';
import type { ChallengeEndedEvent } from '../../domain/events/challenge-ended-event.js';
import type { ChallengeCanceledEvent } from '../../domain/events/challenge-canceled-event.js';
import type { ChallengeParticipationCreatedEvent } from '../../domain/events/challenge-participation-created-event.js';
import type { ChallengeProgressUpdatedEvent } from '../../domain/events/challenge-progress-updated-event.js';
import type { ChallengeParticipantCompletedEvent } from '../../domain/events/challenge-participant-completed-event.js';
import type { ChallengeCompletedEvent } from '../../domain/events/challenge-completed-event.js';
import type { ChallengeInviteSentEvent } from '../../domain/events/challenge-invite-sent-event.js';
import type { ChallengeInviteAcceptedEvent } from '../../domain/events/challenge-invite-accepted-event.js';

export interface IChallengesEventPublisher {
  publishChallengeCreated(event: ChallengeCreatedEvent): Promise<void>;
  publishChallengeStarted(event: ChallengeStartedEvent): Promise<void>;
  publishChallengeEnded(event: ChallengeEndedEvent): Promise<void>;
  publishChallengeCanceled(event: ChallengeCanceledEvent): Promise<void>;
  publishParticipationCreated(event: ChallengeParticipationCreatedEvent): Promise<void>;
  publishProgressUpdated(event: ChallengeProgressUpdatedEvent): Promise<void>;
  publishParticipantCompleted(event: ChallengeParticipantCompletedEvent): Promise<void>;
  publishChallengeCompleted(event: ChallengeCompletedEvent): Promise<void>;
  publishInviteSent(event: ChallengeInviteSentEvent): Promise<void>;
  publishInviteAccepted(event: ChallengeInviteAcceptedEvent): Promise<void>;
}
