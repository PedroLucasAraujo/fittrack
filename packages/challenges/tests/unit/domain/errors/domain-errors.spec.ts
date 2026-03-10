import { describe, it, expect } from 'vitest';
import { InvalidChallengeIdError } from '../../../../domain/errors/invalid-challenge-id-error.js';
import { InvalidInviteError } from '../../../../domain/errors/invalid-invite-error.js';
import { ParticipationNotFoundError } from '../../../../domain/errors/participation-not-found-error.js';
import { InvalidParticipantsCountError } from '../../../../domain/errors/invalid-participants-count-error.js';
import { ChallengeDoesNotRequireInviteError } from '../../../../domain/errors/challenge-does-not-require-invite-error.js';
import { GoalTarget } from '../../../../domain/value-objects/goal-target.js';

/**
 * Targeted coverage for domain error constructors and GoalTarget branches
 * that are not exercised via any use-case test path.
 */
describe('Domain Errors', () => {
  describe('InvalidChallengeIdError', () => {
    it('can be instantiated and has the correct message', () => {
      const err = new InvalidChallengeIdError();
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('UUIDv4');
    });
  });

  describe('InvalidInviteError', () => {
    it('can be instantiated and has the correct message', () => {
      const err = new InvalidInviteError();
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('invite');
    });
  });

  describe('ParticipationNotFoundError', () => {
    it('can be instantiated and has the correct message', () => {
      const err = new ParticipationNotFoundError();
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('participation');
    });
  });

  describe('InvalidParticipantsCountError', () => {
    it('can be instantiated with a custom message', () => {
      const err = new InvalidParticipantsCountError('Must be at least 1.');
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Must be at least 1.');
    });
  });

  describe('ChallengeDoesNotRequireInviteError', () => {
    it('can be instantiated and has the correct message', () => {
      const err = new ChallengeDoesNotRequireInviteError();
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('does not require an invite');
    });
  });
});

describe('GoalTarget', () => {
  describe('create()', () => {
    it('creates a valid goal target of 1 (minimum)', () => {
      const result = GoalTarget.create(1);
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe(1);
    });

    it('creates a valid goal target of 10000 (maximum)', () => {
      const result = GoalTarget.create(10000);
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe(10000);
    });

    it('rejects 0 (below minimum)', () => {
      const result = GoalTarget.create(0);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects 10001 (above maximum)', () => {
      const result = GoalTarget.create(10001);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects negative values', () => {
      const result = GoalTarget.create(-1);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects non-integer values', () => {
      const result = GoalTarget.create(5.5);
      expect(result.isLeft()).toBe(true);
    });
  });
});
