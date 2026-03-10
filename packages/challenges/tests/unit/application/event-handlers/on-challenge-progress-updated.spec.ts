import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { OnChallengeProgressUpdated } from '../../../../application/event-handlers/on-challenge-progress-updated.js';
import type { ChallengeProgressUpdatedEventPayload } from '../../../../application/event-handlers/on-challenge-progress-updated.js';
import { InMemoryChallengeLeaderboardRepository } from '../../../repositories/in-memory-challenge-leaderboard-repository.js';

describe('OnChallengeProgressUpdated', () => {
  let leaderboardRepo: InMemoryChallengeLeaderboardRepository;
  let handler: OnChallengeProgressUpdated;

  beforeEach(() => {
    leaderboardRepo = new InMemoryChallengeLeaderboardRepository();
    handler = new OnChallengeProgressUpdated(leaderboardRepo);
  });

  function makeEvent(
    overrides: Partial<ChallengeProgressUpdatedEventPayload> = {},
  ): ChallengeProgressUpdatedEventPayload {
    return {
      participationId: generateId(),
      challengeId: generateId(),
      userId: generateId(),
      currentProgress: 5,
      progressPercentage: 50,
      completedAtUtc: null,
      updatedAtUtc: new Date(),
      ...overrides,
    };
  }

  it('creates a new leaderboard when none exists for the challenge', async () => {
    const event = makeEvent();
    await handler.handle(event);

    expect(leaderboardRepo.items).toHaveLength(1);
    expect(leaderboardRepo.items[0]!.challengeId).toBe(event.challengeId);
  });

  it('saves leaderboard with the new entry after creation', async () => {
    const event = makeEvent({ currentProgress: 7, progressPercentage: 70 });
    await handler.handle(event);

    const lb = leaderboardRepo.items[0]!;
    expect(lb.entries).toHaveLength(1);
    expect(lb.entries[0]!.currentProgress).toBe(7);
    expect(lb.entries[0]!.progressPercentage).toBe(70);
    expect(lb.entries[0]!.participationId).toBe(event.participationId);
    expect(lb.entries[0]!.userId).toBe(event.userId);
  });

  it('updates an existing leaderboard entry instead of creating a duplicate', async () => {
    const participationId = generateId();
    const challengeId = generateId();
    const userId = generateId();

    // First update
    await handler.handle(makeEvent({ participationId, challengeId, userId, currentProgress: 3 }));
    // Second update for same participation
    await handler.handle(makeEvent({ participationId, challengeId, userId, currentProgress: 8 }));

    const lb = leaderboardRepo.items[0]!;
    expect(lb.entries).toHaveLength(1); // still only one entry
    expect(lb.entries[0]!.currentProgress).toBe(8); // updated
  });

  it('adds a second entry for a different participant in the same challenge', async () => {
    const challengeId = generateId();

    await handler.handle(
      makeEvent({
        challengeId,
        participationId: generateId(),
        userId: generateId(),
        currentProgress: 5,
      }),
    );
    await handler.handle(
      makeEvent({
        challengeId,
        participationId: generateId(),
        userId: generateId(),
        currentProgress: 8,
      }),
    );

    const lb = leaderboardRepo.items[0]!;
    expect(lb.entries).toHaveLength(2);
  });

  it('calculates ranks correctly — higher progress gets lower rank number', async () => {
    const challengeId = generateId();
    const lowId = generateId();
    const highId = generateId();

    await handler.handle(
      makeEvent({ challengeId, participationId: lowId, userId: generateId(), currentProgress: 3 }),
    );
    await handler.handle(
      makeEvent({ challengeId, participationId: highId, userId: generateId(), currentProgress: 9 }),
    );

    const lb = leaderboardRepo.items[0]!;
    const highEntry = lb.entries.find((e) => e.participationId === highId)!;
    const lowEntry = lb.entries.find((e) => e.participationId === lowId)!;

    expect(highEntry.rank).toBe(1);
    expect(lowEntry.rank).toBe(2);
  });

  it('assigns the same rank to tied participants', async () => {
    const challengeId = generateId();
    const p1 = generateId();
    const p2 = generateId();

    await handler.handle(
      makeEvent({ challengeId, participationId: p1, userId: generateId(), currentProgress: 5 }),
    );
    await handler.handle(
      makeEvent({ challengeId, participationId: p2, userId: generateId(), currentProgress: 5 }),
    );

    const lb = leaderboardRepo.items[0]!;
    const entry1 = lb.entries.find((e) => e.participationId === p1)!;
    const entry2 = lb.entries.find((e) => e.participationId === p2)!;

    expect(entry1.rank).toBe(entry2.rank); // same rank for tied progress
  });

  it('sets completedAtUtc on the entry when provided', async () => {
    const completedAt = new Date();
    const event = makeEvent({ completedAtUtc: completedAt });
    await handler.handle(event);

    const lb = leaderboardRepo.items[0]!;
    expect(lb.entries[0]!.completedAtUtc?.getTime()).toBe(completedAt.getTime());
  });

  it('handles separate challenges independently — each gets its own leaderboard', async () => {
    const challenge1 = generateId();
    const challenge2 = generateId();

    await handler.handle(makeEvent({ challengeId: challenge1 }));
    await handler.handle(makeEvent({ challengeId: challenge2 }));

    expect(leaderboardRepo.items).toHaveLength(2);
    expect(leaderboardRepo.items[0]!.challengeId).not.toBe(leaderboardRepo.items[1]!.challengeId);
  });

  it('updates lastUpdatedAtUtc on the leaderboard after upsert', async () => {
    const event = makeEvent();
    const before = new Date();
    await handler.handle(event);
    const lb = leaderboardRepo.items[0]!;
    expect(lb.lastUpdatedAtUtc).not.toBeNull();
    expect(lb.lastUpdatedAtUtc!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('saves leaderboard to repository (saveCount increments)', async () => {
    await handler.handle(makeEvent());
    expect(leaderboardRepo.saveCount).toBe(1);
    await handler.handle(makeEvent({ challengeId: leaderboardRepo.items[0]!.challengeId }));
    expect(leaderboardRepo.saveCount).toBe(2);
  });
});
