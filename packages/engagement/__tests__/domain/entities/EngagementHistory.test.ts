import { describe, it, expect } from 'vitest';
import { EngagementHistory } from '../../../domain/entities/EngagementHistory.js';

const validParams = {
  userId: 'user-123',
  weekStartDate: '2026-03-03',
  weekEndDate: '2026-03-09',
  overallScore: 65,
  workoutScore: 75,
  habitScore: 71,
  goalProgressScore: 50,
  streakScore: 40,
  engagementLevel: 'HIGH',
  workoutsCompleted: 3,
  nutritionLogsCreated: 5,
  bookingsAttended: 2,
  currentStreak: 12,
};

describe('EngagementHistory', () => {
  describe('create()', () => {
    it('creates valid history entry', () => {
      const result = EngagementHistory.create(validParams);
      expect(result.isRight()).toBe(true);
      const entry = result.value as EngagementHistory;
      expect(entry.userId).toBe('user-123');
      expect(entry.weekStartDate).toBe('2026-03-03');
      expect(entry.weekEndDate).toBe('2026-03-09');
      expect(entry.overallScore).toBe(65);
      expect(entry.workoutsCompleted).toBe(3);
    });

    it('assigns generated ID when not provided', () => {
      const result = EngagementHistory.create(validParams);
      expect((result.value as EngagementHistory).id).toBeDefined();
      expect(typeof (result.value as EngagementHistory).id).toBe('string');
    });

    it('uses provided ID', () => {
      const result = EngagementHistory.create({
        ...validParams,
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect((result.value as EngagementHistory).id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('uses provided createdAtUtc', () => {
      const ts = '2026-03-09T00:00:00.000Z';
      const result = EngagementHistory.create({ ...validParams, createdAtUtc: ts });
      expect((result.value as EngagementHistory).createdAtUtc).toBe(ts);
    });

    it('rejects empty userId', () => {
      const result = EngagementHistory.create({ ...validParams, userId: '' });
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty weekStartDate', () => {
      const result = EngagementHistory.create({ ...validParams, weekStartDate: '' });
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty weekEndDate', () => {
      const result = EngagementHistory.create({ ...validParams, weekEndDate: '' });
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('reconstitute()', () => {
    it('bypasses validation and restores from persistence', () => {
      const entry = EngagementHistory.reconstitute('550e8400-e29b-41d4-a716-446655440000', {
        userId: 'user-123',
        weekStartDate: '2026-03-03',
        weekEndDate: '2026-03-09',
        overallScore: 65,
        workoutScore: 75,
        habitScore: 71,
        goalProgressScore: 50,
        streakScore: 40,
        engagementLevel: 'HIGH',
        workoutsCompleted: 3,
        nutritionLogsCreated: 5,
        bookingsAttended: 2,
        currentStreak: 12,
        createdAtUtc: '2026-03-09T00:00:00.000Z',
      });
      expect(entry.overallScore).toBe(65);
      expect(entry.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('getters', () => {
    it('exposes all props via getters', () => {
      const entry = EngagementHistory.create(validParams).value as EngagementHistory;
      expect(entry.habitScore).toBe(71);
      expect(entry.goalProgressScore).toBe(50);
      expect(entry.streakScore).toBe(40);
      expect(entry.engagementLevel).toBe('HIGH');
      expect(entry.nutritionLogsCreated).toBe(5);
      expect(entry.bookingsAttended).toBe(2);
      expect(entry.currentStreak).toBe(12);
    });
  });
});
