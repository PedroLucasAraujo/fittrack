import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CancelChallengeUseCase } from '../../../../application/use-cases/cancel-challenge-use-case.js';
import { InMemoryChallengeRepository } from '../../../repositories/in-memory-challenge-repository.js';
import { InMemoryChallengesEventPublisher } from '../../../stubs/in-memory-challenges-event-publisher.js';
import { makeChallenge } from '../../../helpers/make-challenge.js';

describe('CancelChallengeUseCase', () => {
  let repo: InMemoryChallengeRepository;
  let publisher: InMemoryChallengesEventPublisher;
  let useCase: CancelChallengeUseCase;

  beforeEach(() => {
    repo = new InMemoryChallengeRepository();
    publisher = new InMemoryChallengesEventPublisher();
    useCase = new CancelChallengeUseCase(repo, publisher);
  });

  it('cancels a challenge when canceledBy matches the creator', async () => {
    const creatorId = generateId();
    const challenge = makeChallenge({ createdBy: creatorId, canceledAtUtc: null });
    repo.items.push(challenge);

    const result = await useCase.execute({
      challengeId: challenge.id,
      canceledBy: creatorId,
      reason: 'No longer needed.',
    });

    expect(result.isRight()).toBe(true);
    expect(repo.items[0]!.canceledAtUtc).not.toBeNull();
    expect(publisher.canceledEvents).toHaveLength(1);
  });

  it('returns ChallengeNotFoundError when challenge does not exist', async () => {
    const result = await useCase.execute({
      challengeId: generateId(),
      canceledBy: generateId(),
      reason: 'reason',
    });
    expect(result.isLeft()).toBe(true);
  });

  it('returns ChallengeNotAuthorizedError when canceledBy is not the creator', async () => {
    const creatorId = generateId();
    const otherUserId = generateId();
    const challenge = makeChallenge({ createdBy: creatorId, canceledAtUtc: null });
    repo.items.push(challenge);

    const result = await useCase.execute({
      challengeId: challenge.id,
      canceledBy: otherUserId,
      reason: 'Unauthorized attempt.',
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value.message).toContain('Not authorized');
  });

  it('returns error when challenge is already canceled', async () => {
    const creatorId = generateId();
    const challenge = makeChallenge({ createdBy: creatorId, canceledAtUtc: new Date() });
    repo.items.push(challenge);

    const result = await useCase.execute({
      challengeId: challenge.id,
      canceledBy: creatorId,
      reason: 'Again.',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error when challenge is already ended', async () => {
    const creatorId = generateId();
    const challenge = makeChallenge({
      createdBy: creatorId,
      canceledAtUtc: null,
      endedAtUtc: new Date(),
    });
    repo.items.push(challenge);

    const result = await useCase.execute({
      challengeId: challenge.id,
      canceledBy: creatorId,
      reason: 'Too late.',
    });

    expect(result.isLeft()).toBe(true);
  });
});
