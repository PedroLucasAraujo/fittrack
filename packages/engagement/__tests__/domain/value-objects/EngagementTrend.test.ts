import { describe, it, expect } from 'vitest';
import { EngagementTrend } from '../../../domain/value-objects/EngagementTrend.js';

describe('EngagementTrend', () => {
  describe('create()', () => {
    it('accepts valid trends', () => {
      for (const trend of ['IMPROVING', 'STABLE', 'DECLINING']) {
        expect(EngagementTrend.create(trend).isRight()).toBe(true);
      }
    });

    it('rejects invalid value', () => {
      expect(EngagementTrend.create('UNKNOWN').isLeft()).toBe(true);
    });
  });

  describe('fromDelta()', () => {
    it('returns IMPROVING for delta +10', () => {
      expect(EngagementTrend.fromDelta(10).value).toBe('IMPROVING');
    });

    it('returns IMPROVING for delta +20', () => {
      expect(EngagementTrend.fromDelta(20).value).toBe('IMPROVING');
    });

    it('returns STABLE for delta +9', () => {
      expect(EngagementTrend.fromDelta(9).value).toBe('STABLE');
    });

    it('returns STABLE for delta 0', () => {
      expect(EngagementTrend.fromDelta(0).value).toBe('STABLE');
    });

    it('returns STABLE for delta -9', () => {
      expect(EngagementTrend.fromDelta(-9).value).toBe('STABLE');
    });

    it('returns DECLINING for delta -10', () => {
      expect(EngagementTrend.fromDelta(-10).value).toBe('DECLINING');
    });

    it('returns DECLINING for delta -20', () => {
      expect(EngagementTrend.fromDelta(-20).value).toBe('DECLINING');
    });
  });

  describe('helpers', () => {
    it('isImproving()', () => {
      expect((EngagementTrend.create('IMPROVING').value as EngagementTrend).isImproving()).toBe(true);
      expect((EngagementTrend.create('STABLE').value as EngagementTrend).isImproving()).toBe(false);
    });

    it('isDeclining()', () => {
      expect((EngagementTrend.create('DECLINING').value as EngagementTrend).isDeclining()).toBe(true);
      expect((EngagementTrend.create('IMPROVING').value as EngagementTrend).isDeclining()).toBe(false);
    });

    it('isStable()', () => {
      expect((EngagementTrend.create('STABLE').value as EngagementTrend).isStable()).toBe(true);
      expect((EngagementTrend.create('DECLINING').value as EngagementTrend).isStable()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('returns true for same trend', () => {
      const a = EngagementTrend.create('IMPROVING').value as EngagementTrend;
      const b = EngagementTrend.create('IMPROVING').value as EngagementTrend;
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different trends', () => {
      const a = EngagementTrend.create('IMPROVING').value as EngagementTrend;
      const b = EngagementTrend.create('DECLINING').value as EngagementTrend;
      expect(a.equals(b)).toBe(false);
    });
  });
});
