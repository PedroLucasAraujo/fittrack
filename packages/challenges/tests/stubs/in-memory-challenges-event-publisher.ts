import type { IChallengesEventPublisher } from '../../application/ports/i-challenges-event-publisher.js';
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

export class InMemoryChallengesEventPublisher implements IChallengesEventPublisher {
  createdEvents: ChallengeCreatedEvent[] = [];
  startedEvents: ChallengeStartedEvent[] = [];
  endedEvents: ChallengeEndedEvent[] = [];
  canceledEvents: ChallengeCanceledEvent[] = [];
  participationCreatedEvents: ChallengeParticipationCreatedEvent[] = [];
  progressUpdatedEvents: ChallengeProgressUpdatedEvent[] = [];
  participantCompletedEvents: ChallengeParticipantCompletedEvent[] = [];
  challengeCompletedEvents: ChallengeCompletedEvent[] = [];
  inviteSentEvents: ChallengeInviteSentEvent[] = [];
  inviteAcceptedEvents: ChallengeInviteAcceptedEvent[] = [];

  async publishChallengeCreated(event: ChallengeCreatedEvent): Promise<void> {
    this.createdEvents.push(event);
  }

  async publishChallengeStarted(event: ChallengeStartedEvent): Promise<void> {
    this.startedEvents.push(event);
  }

  async publishChallengeEnded(event: ChallengeEndedEvent): Promise<void> {
    this.endedEvents.push(event);
  }

  async publishChallengeCanceled(event: ChallengeCanceledEvent): Promise<void> {
    this.canceledEvents.push(event);
  }

  async publishParticipationCreated(event: ChallengeParticipationCreatedEvent): Promise<void> {
    this.participationCreatedEvents.push(event);
  }

  async publishProgressUpdated(event: ChallengeProgressUpdatedEvent): Promise<void> {
    this.progressUpdatedEvents.push(event);
  }

  async publishParticipantCompleted(event: ChallengeParticipantCompletedEvent): Promise<void> {
    this.participantCompletedEvents.push(event);
  }

  async publishChallengeCompleted(event: ChallengeCompletedEvent): Promise<void> {
    this.challengeCompletedEvents.push(event);
  }

  async publishInviteSent(event: ChallengeInviteSentEvent): Promise<void> {
    this.inviteSentEvents.push(event);
  }

  async publishInviteAccepted(event: ChallengeInviteAcceptedEvent): Promise<void> {
    this.inviteAcceptedEvents.push(event);
  }
}
