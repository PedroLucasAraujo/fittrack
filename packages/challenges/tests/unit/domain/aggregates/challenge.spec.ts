import { describe, it, expect, afterEach, vi } from 'vitest';
import { makeChallenge } from '../../../helpers/make-challenge.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('Challenge', () => {
  describe('start()', () => {
    it('marks challenge as started when in DRAFT state', () => {
      const challenge = makeChallenge({ startedAtUtc: null, canceledAtUtc: null });
      const result = challenge.start();
      expect(result.isRight()).toBe(true);
      expect(result.value as { type: string }).toHaveProperty('type', 'started');
      expect(challenge.startedAtUtc).not.toBeNull();
    });

    it('sets updatedAtUtc when started', () => {
      const challenge = makeChallenge({ startedAtUtc: null });
      const before = new Date();
      challenge.start();
      const updatedAt = challenge.updatedAtUtc.value;
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('fails with ChallengeAlreadyStartedError if already started', () => {
      const challenge = makeChallenge({ startedAtUtc: new Date() });
      const result = challenge.start();
      expect(result.isLeft()).toBe(true);
      expect((result.value as { message: string }).message).toContain('already');
    });

    it('fails with ChallengeAlreadyCanceledError if canceled', () => {
      const challenge = makeChallenge({ canceledAtUtc: new Date() });
      const result = challenge.start();
      expect(result.isLeft()).toBe(true);
      expect((result.value as { message: string }).message).toContain('cancel');
    });
  });

  describe('end()', () => {
    it('marks challenge as ended when endDate has passed and challenge was started', () => {
      const pastDate = new Date(Date.now() - 1000);
      const challenge = makeChallenge({
        startedAtUtc: new Date(Date.now() - 2000),
        endDateUtc: pastDate,
        endedAtUtc: null,
        canceledAtUtc: null,
      });
      const result = challenge.end();
      expect(result.isRight()).toBe(true);
      expect(result.value as { type: string }).toHaveProperty('type', 'ended');
      expect(challenge.endedAtUtc).not.toBeNull();
    });

    it('sets updatedAtUtc when ended', () => {
      const pastDate = new Date(Date.now() - 1000);
      const challenge = makeChallenge({
        startedAtUtc: new Date(Date.now() - 2000),
        endDateUtc: pastDate,
        endedAtUtc: null,
      });
      const before = new Date();
      challenge.end();
      expect(challenge.updatedAtUtc.value.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('fails with ChallengeNotEndedError when endDate is in the future', () => {
      const futureDate = new Date(Date.now() + 100_000);
      const challenge = makeChallenge({ endDateUtc: futureDate, endedAtUtc: null });
      const result = challenge.end();
      expect(result.isLeft()).toBe(true);
      expect((result.value as { message: string }).message).toContain('ended');
    });

    it('fails with ChallengeAlreadyEndedError when already ended', () => {
      const pastDate = new Date(Date.now() - 1000);
      const challenge = makeChallenge({ endDateUtc: pastDate, endedAtUtc: pastDate });
      const result = challenge.end();
      expect(result.isLeft()).toBe(true);
    });

    it('fails with ChallengeAlreadyCanceledError when canceled', () => {
      const pastDate = new Date(Date.now() - 1000);
      const challenge = makeChallenge({
        endDateUtc: pastDate,
        canceledAtUtc: new Date(),
        endedAtUtc: null,
      });
      const result = challenge.end();
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('cancel()', () => {
    it('marks challenge as canceled with a reason', () => {
      const challenge = makeChallenge({ canceledAtUtc: null, endedAtUtc: null });
      const result = challenge.cancel('Not enough participants');
      expect(result.isRight()).toBe(true);
      expect(result.value as { type: string; reason: string }).toHaveProperty('type', 'canceled');
      expect(result.value as { type: string; reason: string }).toHaveProperty(
        'reason',
        'Not enough participants',
      );
      expect(challenge.canceledAtUtc).not.toBeNull();
    });

    it('sets updatedAtUtc when canceled', () => {
      const challenge = makeChallenge({ canceledAtUtc: null });
      const before = new Date();
      challenge.cancel('reason');
      expect(challenge.updatedAtUtc.value.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('fails with ChallengeAlreadyCanceledError if already canceled', () => {
      const challenge = makeChallenge({ canceledAtUtc: new Date() });
      const result = challenge.cancel('reason');
      expect(result.isLeft()).toBe(true);
    });

    it('fails with ChallengeAlreadyEndedError if already ended', () => {
      const pastDate = new Date(Date.now() - 1000);
      const challenge = makeChallenge({ endedAtUtc: pastDate, canceledAtUtc: null });
      const result = challenge.cancel('reason');
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('isDraft()', () => {
    it('returns true when challenge has not been started and not canceled', () => {
      const challenge = makeChallenge({ startedAtUtc: null, canceledAtUtc: null });
      expect(challenge.isDraft()).toBe(true);
    });

    it('returns false when challenge has been started', () => {
      const challenge = makeChallenge({ startedAtUtc: new Date() });
      expect(challenge.isDraft()).toBe(false);
    });

    it('returns false when challenge is canceled', () => {
      const challenge = makeChallenge({ canceledAtUtc: new Date(), startedAtUtc: null });
      expect(challenge.isDraft()).toBe(false);
    });
  });

  describe('isActive()', () => {
    it('returns true when started and endDate is in the future', () => {
      const challenge = makeChallenge({
        startedAtUtc: new Date(),
        endedAtUtc: null,
        canceledAtUtc: null,
        endDateUtc: new Date(Date.now() + 100_000),
      });
      expect(challenge.isActive()).toBe(true);
    });

    it('returns false when not started', () => {
      const challenge = makeChallenge({
        startedAtUtc: null,
        endDateUtc: new Date(Date.now() + 100_000),
      });
      expect(challenge.isActive()).toBe(false);
    });

    it('returns false when endDate has passed (even if endedAtUtc not set)', () => {
      const challenge = makeChallenge({
        startedAtUtc: new Date(Date.now() - 2000),
        endDateUtc: new Date(Date.now() - 1000),
        endedAtUtc: null,
        canceledAtUtc: null,
      });
      expect(challenge.isActive()).toBe(false);
    });

    it('returns false when endedAtUtc is set', () => {
      const pastDate = new Date(Date.now() - 1000);
      const challenge = makeChallenge({
        startedAtUtc: new Date(Date.now() - 2000),
        endedAtUtc: pastDate,
        canceledAtUtc: null,
        endDateUtc: pastDate,
      });
      expect(challenge.isActive()).toBe(false);
    });

    it('returns false when canceled', () => {
      const challenge = makeChallenge({
        startedAtUtc: new Date(),
        canceledAtUtc: new Date(),
        endDateUtc: new Date(Date.now() + 100_000),
      });
      expect(challenge.isActive()).toBe(false);
    });
  });

  describe('hasEnded()', () => {
    it('returns true when endDate has passed', () => {
      const challenge = makeChallenge({ endDateUtc: new Date(Date.now() - 1000) });
      expect(challenge.hasEnded()).toBe(true);
    });

    it('returns true when endedAtUtc is set even if date not yet passed', () => {
      const challenge = makeChallenge({
        endedAtUtc: new Date(),
        endDateUtc: new Date(Date.now() + 100_000),
      });
      expect(challenge.hasEnded()).toBe(true);
    });

    it('returns false when endDate is in the future and endedAtUtc is null', () => {
      const challenge = makeChallenge({
        endDateUtc: new Date(Date.now() + 100_000),
        endedAtUtc: null,
      });
      expect(challenge.hasEnded()).toBe(false);
    });
  });

  describe('isCanceled()', () => {
    it('returns true when canceledAtUtc is set', () => {
      const challenge = makeChallenge({ canceledAtUtc: new Date() });
      expect(challenge.isCanceled()).toBe(true);
    });

    it('returns false when canceledAtUtc is null', () => {
      const challenge = makeChallenge({ canceledAtUtc: null });
      expect(challenge.isCanceled()).toBe(false);
    });
  });

  describe('canJoin()', () => {
    it('returns true when active and not canceled', () => {
      const challenge = makeChallenge({
        startedAtUtc: new Date(),
        endedAtUtc: null,
        canceledAtUtc: null,
        endDateUtc: new Date(Date.now() + 100_000),
      });
      expect(challenge.canJoin()).toBe(true);
    });

    it('returns false when not active', () => {
      const challenge = makeChallenge({ startedAtUtc: null });
      expect(challenge.canJoin()).toBe(false);
    });
  });

  describe('hasStarted()', () => {
    it('returns true when startedAtUtc is set', () => {
      const challenge = makeChallenge({ startedAtUtc: new Date() });
      expect(challenge.hasStarted()).toBe(true);
    });

    it('returns true when startDateUtc is in the past even if startedAtUtc not set', () => {
      const challenge = makeChallenge({
        startedAtUtc: null,
        startDateUtc: new Date(Date.now() - 1000),
      });
      expect(challenge.hasStarted()).toBe(true);
    });

    it('returns false when startedAtUtc is null and startDate is in the future', () => {
      const challenge = makeChallenge({
        startedAtUtc: null,
        startDateUtc: new Date(Date.now() + 100_000),
      });
      expect(challenge.hasStarted()).toBe(false);
    });
  });

  describe('requiresInvite()', () => {
    it('returns true for PRIVATE visibility', () => {
      const challenge = makeChallenge({ visibility: 'PRIVATE' });
      expect(challenge.requiresInvite()).toBe(true);
    });

    it('returns false for PUBLIC visibility', () => {
      const challenge = makeChallenge({ visibility: 'PUBLIC' });
      expect(challenge.requiresInvite()).toBe(false);
    });

    it('returns false for PROFESSIONAL visibility', () => {
      const challenge = makeChallenge({ visibility: 'PROFESSIONAL' });
      expect(challenge.requiresInvite()).toBe(false);
    });
  });

  describe('isHeadToHead()', () => {
    it('returns true for HEAD_TO_HEAD type', () => {
      const challenge = makeChallenge({ type: 'HEAD_TO_HEAD' });
      expect(challenge.isHeadToHead()).toBe(true);
    });

    it('returns false for COMMUNITY type', () => {
      const challenge = makeChallenge({ type: 'COMMUNITY' });
      expect(challenge.isHeadToHead()).toBe(false);
    });

    it('returns false for INDIVIDUAL type', () => {
      const challenge = makeChallenge({ type: 'INDIVIDUAL' });
      expect(challenge.isHeadToHead()).toBe(false);
    });
  });

  describe('getters', () => {
    it('exposes all props via getters', () => {
      const createdBy = '11111111-1111-4111-8111-111111111111';
      const start = new Date(Date.now() + 1000);
      const end = new Date(Date.now() + 86_400_000);
      const challenge = makeChallenge({
        createdBy,
        type: 'COMMUNITY',
        visibility: 'PUBLIC',
        name: 'Test',
        description: 'Test description that is long enough.',
        category: 'WORKOUT',
        goalMetricType: 'WORKOUT_COUNT',
        goalTargetValue: 5,
        startDateUtc: start,
        endDateUtc: end,
        maxParticipants: 50,
        rewardPolicy: 'TOP_3',
      });
      expect(challenge.createdBy).toBe(createdBy);
      expect(challenge.type).toBe('COMMUNITY');
      expect(challenge.visibility).toBe('PUBLIC');
      expect(challenge.name).toBe('Test');
      expect(challenge.category).toBe('WORKOUT');
      expect(challenge.goalMetricType).toBe('WORKOUT_COUNT');
      expect(challenge.goalTargetValue).toBe(5);
      expect(challenge.maxParticipants).toBe(50);
      expect(challenge.rewardPolicy).toBe('TOP_3');
      expect(challenge.startDateUtc).toBe(start);
      expect(challenge.endDateUtc).toBe(end);
      expect(challenge.createdAtUtc).toBeDefined();
      expect(challenge.updatedAtUtc).toBeDefined();
    });
  });
});
