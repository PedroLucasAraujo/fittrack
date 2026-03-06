import { describe, it, expect } from 'vitest';
import { AchievementDefinition } from '../../../../domain/aggregates/achievement-definition.js';
import { AchievementCode } from '../../../../domain/value-objects/achievement-code.js';
import { AchievementName } from '../../../../domain/value-objects/achievement-name.js';
import { AchievementDescription } from '../../../../domain/value-objects/achievement-description.js';
import { AchievementCategory } from '../../../../domain/value-objects/achievement-category.js';
import { AchievementTier } from '../../../../domain/value-objects/achievement-tier.js';
import { AchievementCriteria } from '../../../../domain/value-objects/achievement-criteria.js';
import { IconUrl } from '../../../../domain/value-objects/icon-url.js';
import { AchievementErrorCodes } from '../../../../domain/errors/achievement-error-codes.js';

function makeDefinition(
  overrides: Partial<Parameters<typeof AchievementDefinition.create>[0]> = {},
) {
  const code = AchievementCode.create('FIRST_WORKOUT');
  const name = AchievementName.create('First Workout');
  const description = AchievementDescription.create('Complete your first workout');
  const category = AchievementCategory.create('WORKOUT');
  const tier = AchievementTier.create('BRONZE');
  const criteria = AchievementCriteria.create({
    metric: 'workout_count',
    operator: '>=',
    targetValue: 1,
  });
  const iconUrl = IconUrl.create('https://cdn.fittrack.com/achievements/first-workout.png');

  if (
    code.isLeft() ||
    name.isLeft() ||
    description.isLeft() ||
    category.isLeft() ||
    tier.isLeft() ||
    criteria.isLeft() ||
    iconUrl.isLeft()
  ) {
    throw new Error('test helper: VO creation failed');
  }

  return AchievementDefinition.create({
    code: code.value,
    name: name.value,
    description: description.value,
    category: category.value,
    tier: tier.value,
    criteria: criteria.value,
    iconUrl: iconUrl.value,
    ...overrides,
  });
}

describe('AchievementDefinition', () => {
  describe('create()', () => {
    it('creates a definition in inactive state', () => {
      const result = makeDefinition();
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.isActive()).toBe(false);
        expect(result.value.isRepeatable).toBe(false);
        expect(result.value.getDomainEvents()).toHaveLength(0);
      }
    });

    it('exposes all getters correctly', () => {
      const result = makeDefinition();
      if (result.isRight()) {
        const d = result.value;
        expect(d.code.value).toBe('FIRST_WORKOUT');
        expect(d.name.value).toBe('First Workout');
        expect(d.description.value).toBe('Complete your first workout');
        expect(d.category.value).toBe('WORKOUT');
        expect(d.tier.value).toBe('BRONZE');
        expect(d.criteria.targetValue.value).toBe(1);
        expect(d.iconUrl.value).toBe('https://cdn.fittrack.com/achievements/first-workout.png');
        expect(d.version).toBe(0);
        expect(typeof d.createdAtUtc).toBe('string');
      }
    });

    it('generates a UUIDv4 id when no id is provided', () => {
      const result = makeDefinition();
      if (result.isRight()) {
        expect(result.value.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      }
    });

    it('uses an explicit id when provided', () => {
      const result = makeDefinition({ id: 'aaaaaaaa-0000-4000-8000-000000000001' });
      if (result.isRight()) {
        expect(result.value.id).toBe('aaaaaaaa-0000-4000-8000-000000000001');
      }
    });
  });

  describe('activate()', () => {
    it('transitions to active state', () => {
      const result = makeDefinition();
      if (result.isRight()) {
        const d = result.value;
        expect(d.isActive()).toBe(false);
        const activateResult = d.activate();
        expect(activateResult.isRight()).toBe(true);
        expect(d.isActive()).toBe(true);
      }
    });

    it('returns Left when already active', () => {
      const result = makeDefinition();
      if (result.isRight()) {
        const d = result.value;
        d.activate();
        const secondActivate = d.activate();
        expect(secondActivate.isLeft()).toBe(true);
        if (secondActivate.isLeft()) {
          expect(secondActivate.value.code).toBe(
            AchievementErrorCodes.INVALID_ACHIEVEMENT_DEFINITION,
          );
        }
      }
    });
  });

  describe('deactivate()', () => {
    it('transitions to inactive state after being active', () => {
      const result = makeDefinition();
      if (result.isRight()) {
        const d = result.value;
        d.activate();
        const deactivateResult = d.deactivate();
        expect(deactivateResult.isRight()).toBe(true);
        expect(d.isActive()).toBe(false);
      }
    });

    it('returns Left when already inactive', () => {
      const result = makeDefinition();
      if (result.isRight()) {
        const d = result.value;
        const deactivateResult = d.deactivate();
        expect(deactivateResult.isLeft()).toBe(true);
        if (deactivateResult.isLeft()) {
          expect(deactivateResult.value.code).toBe(
            AchievementErrorCodes.INVALID_ACHIEVEMENT_DEFINITION,
          );
        }
      }
    });
  });

  describe('matchesCriteria()', () => {
    it('returns true when currentValue satisfies criteria', () => {
      const result = makeDefinition();
      if (result.isRight()) {
        expect(result.value.matchesCriteria(1)).toBe(true);
        expect(result.value.matchesCriteria(5)).toBe(true);
      }
    });

    it('returns false when currentValue does not satisfy criteria', () => {
      const result = makeDefinition();
      if (result.isRight()) {
        expect(result.value.matchesCriteria(0)).toBe(false);
      }
    });
  });

  describe('reconstitute()', () => {
    it('restores all props and version', () => {
      const createResult = makeDefinition();
      if (createResult.isRight()) {
        const original = createResult.value;
        const reconstituted = AchievementDefinition.reconstitute(
          original.id,
          {
            code: original.code,
            name: original.name,
            description: original.description,
            category: original.category,
            tier: original.tier,
            criteria: original.criteria,
            iconUrl: original.iconUrl,
            isRepeatable: false,
            active: true,
            createdAtUtc: original.createdAtUtc,
          },
          3,
        );
        expect(reconstituted.id).toBe(original.id);
        expect(reconstituted.version).toBe(3);
        expect(reconstituted.isActive()).toBe(true);
      }
    });
  });

  describe('ADR-0009 §3 — no domain events collected', () => {
    it('does not collect domain events', () => {
      const result = makeDefinition();
      if (result.isRight()) {
        expect(result.value.getDomainEvents()).toHaveLength(0);
      }
    });
  });
});
