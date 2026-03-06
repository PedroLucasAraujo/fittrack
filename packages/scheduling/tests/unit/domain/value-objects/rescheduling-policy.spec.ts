import { describe, it, expect } from 'vitest';
import { ReschedulingPolicy } from '../../../../domain/value-objects/rescheduling-policy.js';
import { SchedulingErrorCodes } from '../../../../domain/errors/scheduling-error-codes.js';

describe('ReschedulingPolicy', () => {
  describe('create()', () => {
    it('creates a valid policy with given values', () => {
      const result = ReschedulingPolicy.create(48, 3);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.minNoticeHours).toBe(48);
        expect(result.value.maxReschedules).toBe(3);
      }
    });

    it('creates a policy with minNoticeHours = 0', () => {
      const result = ReschedulingPolicy.create(0, 1);
      expect(result.isRight()).toBe(true);
    });

    it('creates a policy with maxReschedules = 0 (no reschedules allowed)', () => {
      const result = ReschedulingPolicy.create(24, 0);
      expect(result.isRight()).toBe(true);
    });

    it('creates a policy at maximum minNoticeHours (168h = 1 week)', () => {
      const result = ReschedulingPolicy.create(168, 2);
      expect(result.isRight()).toBe(true);
    });

    it('creates a policy at maximum maxReschedules (10)', () => {
      const result = ReschedulingPolicy.create(24, 10);
      expect(result.isRight()).toBe(true);
    });

    it('rejects non-integer minNoticeHours', () => {
      const result = ReschedulingPolicy.create(24.5, 2);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_RESCHEDULE_POLICY);
      }
    });

    it('rejects negative minNoticeHours', () => {
      const result = ReschedulingPolicy.create(-1, 2);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_RESCHEDULE_POLICY);
      }
    });

    it('rejects minNoticeHours above 168', () => {
      const result = ReschedulingPolicy.create(169, 2);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_RESCHEDULE_POLICY);
      }
    });

    it('rejects non-integer maxReschedules', () => {
      const result = ReschedulingPolicy.create(24, 1.5);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_RESCHEDULE_POLICY);
      }
    });

    it('rejects negative maxReschedules', () => {
      const result = ReschedulingPolicy.create(24, -1);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_RESCHEDULE_POLICY);
      }
    });

    it('rejects maxReschedules above 10', () => {
      const result = ReschedulingPolicy.create(24, 11);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_RESCHEDULE_POLICY);
      }
    });
  });

  describe('default()', () => {
    it('returns platform default policy (24h notice, 2 max reschedules)', () => {
      const policy = ReschedulingPolicy.default();

      expect(policy.minNoticeHours).toBe(ReschedulingPolicy.DEFAULT_MIN_NOTICE_HOURS);
      expect(policy.maxReschedules).toBe(ReschedulingPolicy.DEFAULT_MAX_RESCHEDULES);
      expect(policy.minNoticeHours).toBe(24);
      expect(policy.maxReschedules).toBe(2);
    });
  });
});
