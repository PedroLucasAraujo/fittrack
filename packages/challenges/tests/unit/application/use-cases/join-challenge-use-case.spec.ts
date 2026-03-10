import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { JoinChallengeUseCase } from '../../../../application/use-cases/join-challenge-use-case.js';
import { InMemoryChallengeRepository } from '../../../repositories/in-memory-challenge-repository.js';
import { InMemoryChallengeParticipationRepository } from '../../../repositories/in-memory-challenge-participation-repository.js';
import { InMemoryChallengesEventPublisher } from '../../../stubs/in-memory-challenges-event-publisher.js';
import { makeChallenge } from '../../../helpers/make-challenge.js';
import { makeChallengeParticipation } from '../../../helpers/make-challenge-participation.js';

describe('JoinChallengeUseCase', () => {
  let challengeRepo: InMemoryChallengeRepository;
  let participationRepo: InMemoryChallengeParticipationRepository;
  let publisher: InMemoryChallengesEventPublisher;
  let useCase: JoinChallengeUseCase;

  beforeEach(() => {
    challengeRepo = new InMemoryChallengeRepository();
    participationRepo = new InMemoryChallengeParticipationRepository();
    publisher = new InMemoryChallengesEventPublisher();
    useCase = new JoinChallengeUseCase(challengeRepo, participationRepo, publisher);
  });

  function makeActiveChallenge(overrides: Parameters<typeof makeChallenge>[0] = {}) {
    return makeChallenge({
      startedAtUtc: new Date(),
      endedAtUtc: null,
      canceledAtUtc: null,
      endDateUtc: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ...overrides,
    });
  }

  it('allows a user to join an active public challenge', async () => {
    const challenge = makeActiveChallenge({ visibility: 'PUBLIC' });
    challengeRepo.items.push(challenge);

    const result = await useCase.execute({
      challengeId: challenge.id,
      userId: generateId(),
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.participationId).toBeDefined();
    expect(participationRepo.items).toHaveLength(1);
  });

  it('publishes ChallengeParticipationCreatedEvent on success', async () => {
    const challenge = makeActiveChallenge();
    challengeRepo.items.push(challenge);

    const userId = generateId();
    await useCase.execute({ challengeId: challenge.id, userId });

    expect(publisher.participationCreatedEvents).toHaveLength(1);
    const event = publisher.participationCreatedEvents[0]!;
    expect(event.payload.challengeId).toBe(challenge.id);
    expect(event.payload.userId).toBe(userId);
  });

  it('fails with ChallengeNotFoundError when challengeId does not exist', async () => {
    const result = await useCase.execute({
      challengeId: generateId(),
      userId: generateId(),
    });
    expect(result.isLeft()).toBe(true);
    expect(result.value.message).toContain('found');
  });

  it('fails with ChallengeNotFoundError for invalid challengeId UUID', async () => {
    const result = await useCase.execute({
      challengeId: 'not-a-uuid',
      userId: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails with ChallengeNotFoundError for invalid userId UUID', async () => {
    const challenge = makeActiveChallenge();
    challengeRepo.items.push(challenge);
    const result = await useCase.execute({
      challengeId: challenge.id,
      userId: 'not-a-uuid',
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails with ChallengeNotJoinableError when challenge is in DRAFT state', () => {
    const challenge = makeChallenge({ startedAtUtc: null }); // DRAFT
    challengeRepo.items.push(challenge);

    return expect(
      useCase.execute({ challengeId: challenge.id, userId: generateId() }),
    ).resolves.toSatisfy((r: Awaited<ReturnType<JoinChallengeUseCase['execute']>>) => r.isLeft());
  });

  it('fails with ChallengeNotJoinableError when challenge is canceled', async () => {
    const challenge = makeChallenge({
      startedAtUtc: new Date(),
      canceledAtUtc: new Date(),
      endDateUtc: new Date(Date.now() + 100_000),
    });
    challengeRepo.items.push(challenge);

    const result = await useCase.execute({
      challengeId: challenge.id,
      userId: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails with ChallengeNotJoinableError when challenge endDate has passed', async () => {
    const challenge = makeChallenge({
      startedAtUtc: new Date(Date.now() - 2000),
      endDateUtc: new Date(Date.now() - 1000), // past
      endedAtUtc: null,
      canceledAtUtc: null,
    });
    challengeRepo.items.push(challenge);

    const result = await useCase.execute({
      challengeId: challenge.id,
      userId: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails with AlreadyJoinedChallengeError when same user joins twice', async () => {
    const challenge = makeActiveChallenge();
    challengeRepo.items.push(challenge);
    const userId = generateId();

    // First join — succeeds
    await useCase.execute({ challengeId: challenge.id, userId });
    // Second join — fails
    const result = await useCase.execute({ challengeId: challenge.id, userId });
    expect(result.isLeft()).toBe(true);
    expect(result.value.message).toContain('joined');
  });

  it('fails with ChallengeFullError when challenge is at maxParticipants', async () => {
    const challenge = makeActiveChallenge({ maxParticipants: 1 });
    challengeRepo.items.push(challenge);

    // Pre-fill with one participant
    participationRepo.items.push(
      makeChallengeParticipation({ challengeId: challenge.id, userId: generateId() }),
    );

    const result = await useCase.execute({
      challengeId: challenge.id,
      userId: generateId(), // new user — but challenge is full
    });
    expect(result.isLeft()).toBe(true);
    expect(result.value.message).toContain('maximum');
  });

  it('allows joining when maxParticipants is null (no limit)', async () => {
    const challenge = makeActiveChallenge({ maxParticipants: null });
    challengeRepo.items.push(challenge);

    // Join many times with different users
    for (let i = 0; i < 5; i++) {
      const r = await useCase.execute({ challengeId: challenge.id, userId: generateId() });
      expect(r.isRight()).toBe(true);
    }
    expect(participationRepo.items).toHaveLength(5);
  });

  it('creates participation with currentProgress=0 and progressPercentage=0', async () => {
    const challenge = makeActiveChallenge();
    challengeRepo.items.push(challenge);
    await useCase.execute({ challengeId: challenge.id, userId: generateId() });
    const p = participationRepo.items[0]!;
    expect(p.currentProgress).toBe(0);
    expect(p.progressPercentage).toBe(0);
    expect(p.completedAtUtc).toBeNull();
  });
});
