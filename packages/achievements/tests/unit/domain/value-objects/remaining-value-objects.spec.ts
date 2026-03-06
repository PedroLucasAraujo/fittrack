import { describe, it, expect } from 'vitest';
import { AchievementName } from '../../../../domain/value-objects/achievement-name.js';
import { AchievementDescription } from '../../../../domain/value-objects/achievement-description.js';
import { IconUrl } from '../../../../domain/value-objects/icon-url.js';
import {
  AchievementCategory,
  AchievementCategoryType,
} from '../../../../domain/value-objects/achievement-category.js';
import {
  AchievementTier,
  AchievementTierType,
} from '../../../../domain/value-objects/achievement-tier.js';
import {
  CriteriaOperator,
  CriteriaOperatorType,
} from '../../../../domain/value-objects/criteria-operator.js';
import { TargetValue } from '../../../../domain/value-objects/target-value.js';
import { AchievementErrorCodes } from '../../../../domain/errors/achievement-error-codes.js';

// ── AchievementName ──────────────────────────────────────────────────────────

describe('AchievementName', () => {
  it('creates valid name', () => {
    const r = AchievementName.create('First Workout');
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe('First Workout');
  });

  it('trims whitespace', () => {
    const r = AchievementName.create('  First Workout  ');
    if (r.isRight()) expect(r.value.value).toBe('First Workout');
  });

  it('returns Left for empty string', () => {
    const r = AchievementName.create('');
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.code).toBe(AchievementErrorCodes.INVALID_ACHIEVEMENT_DEFINITION);
  });

  it('returns Left for whitespace-only', () => {
    expect(AchievementName.create('   ').isLeft()).toBe(true);
  });

  it('returns Left when exceeds 100 chars', () => {
    expect(AchievementName.create('A'.repeat(101)).isLeft()).toBe(true);
  });

  it('accepts exactly 100 chars', () => {
    expect(AchievementName.create('A'.repeat(100)).isRight()).toBe(true);
  });

  it('equals() works correctly', () => {
    const a = AchievementName.create('Test');
    const b = AchievementName.create('Test');
    const c = AchievementName.create('Other');
    if (a.isRight() && b.isRight() && c.isRight()) {
      expect(a.value.equals(b.value)).toBe(true);
      expect(a.value.equals(c.value)).toBe(false);
    }
  });

  it('toString() returns value', () => {
    const r = AchievementName.create('My Achievement');
    if (r.isRight()) expect(r.value.toString()).toBe('My Achievement');
  });
});

// ── AchievementDescription ───────────────────────────────────────────────────

describe('AchievementDescription', () => {
  it('creates valid description', () => {
    const r = AchievementDescription.create('Complete your first workout');
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe('Complete your first workout');
  });

  it('trims whitespace', () => {
    const r = AchievementDescription.create('  desc  ');
    if (r.isRight()) expect(r.value.value).toBe('desc');
  });

  it('returns Left for empty string', () => {
    expect(AchievementDescription.create('').isLeft()).toBe(true);
  });

  it('returns Left for whitespace-only', () => {
    expect(AchievementDescription.create('   ').isLeft()).toBe(true);
  });

  it('returns Left when exceeds 500 chars', () => {
    expect(AchievementDescription.create('A'.repeat(501)).isLeft()).toBe(true);
  });

  it('accepts exactly 500 chars', () => {
    expect(AchievementDescription.create('A'.repeat(500)).isRight()).toBe(true);
  });

  it('equals() and toString() work', () => {
    const a = AchievementDescription.create('desc');
    const b = AchievementDescription.create('desc');
    if (a.isRight() && b.isRight()) {
      expect(a.value.equals(b.value)).toBe(true);
      expect(a.value.toString()).toBe('desc');
    }
  });
});

// ── IconUrl ──────────────────────────────────────────────────────────────────

describe('IconUrl', () => {
  it('creates valid URL', () => {
    const r = IconUrl.create('https://cdn.example.com/icon.png');
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe('https://cdn.example.com/icon.png');
  });

  it('trims whitespace', () => {
    const r = IconUrl.create('  https://cdn.example.com/icon.png  ');
    if (r.isRight()) expect(r.value.value).toBe('https://cdn.example.com/icon.png');
  });

  it('returns Left for empty string', () => {
    expect(IconUrl.create('').isLeft()).toBe(true);
  });

  it('returns Left for whitespace-only', () => {
    expect(IconUrl.create('   ').isLeft()).toBe(true);
  });

  it('returns Left when exceeds 2048 chars', () => {
    expect(IconUrl.create('a'.repeat(2049)).isLeft()).toBe(true);
  });

  it('equals() and toString() work', () => {
    const a = IconUrl.create('https://example.com/a.png');
    const b = IconUrl.create('https://example.com/a.png');
    const c = IconUrl.create('https://example.com/b.png');
    if (a.isRight() && b.isRight() && c.isRight()) {
      expect(a.value.equals(b.value)).toBe(true);
      expect(a.value.equals(c.value)).toBe(false);
      expect(a.value.toString()).toBe('https://example.com/a.png');
    }
  });
});

// ── AchievementCategory ──────────────────────────────────────────────────────

describe('AchievementCategory', () => {
  it('creates all valid categories', () => {
    for (const cat of Object.values(AchievementCategoryType)) {
      expect(AchievementCategory.create(cat).isRight()).toBe(true);
    }
  });

  it('returns Left for invalid category', () => {
    const r = AchievementCategory.create('INVALID');
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.code).toBe(AchievementErrorCodes.INVALID_ACHIEVEMENT_DEFINITION);
  });

  it('equals() works', () => {
    const a = AchievementCategory.create('WORKOUT');
    const b = AchievementCategory.create('WORKOUT');
    const c = AchievementCategory.create('STREAK');
    if (a.isRight() && b.isRight() && c.isRight()) {
      expect(a.value.equals(b.value)).toBe(true);
      expect(a.value.equals(c.value)).toBe(false);
    }
  });

  it('toString() returns value', () => {
    const r = AchievementCategory.create('MILESTONE');
    if (r.isRight()) expect(r.value.toString()).toBe('MILESTONE');
  });
});

// ── AchievementTier ──────────────────────────────────────────────────────────

describe('AchievementTier', () => {
  it('creates all valid tiers', () => {
    for (const tier of Object.values(AchievementTierType)) {
      expect(AchievementTier.create(tier).isRight()).toBe(true);
    }
  });

  it('returns Left for invalid tier', () => {
    const r = AchievementTier.create('DIAMOND');
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.code).toBe(AchievementErrorCodes.INVALID_ACHIEVEMENT_DEFINITION);
  });

  it('getColor() returns correct hex for BRONZE', () => {
    const r = AchievementTier.create('BRONZE');
    if (r.isRight()) expect(r.value.getColor()).toBe('#CD7F32');
  });

  it('getColor() returns correct hex for SILVER', () => {
    const r = AchievementTier.create('SILVER');
    if (r.isRight()) expect(r.value.getColor()).toBe('#C0C0C0');
  });

  it('getColor() returns correct hex for GOLD', () => {
    const r = AchievementTier.create('GOLD');
    if (r.isRight()) expect(r.value.getColor()).toBe('#FFD700');
  });

  it('equals() and toString() work', () => {
    const a = AchievementTier.create('GOLD');
    const b = AchievementTier.create('GOLD');
    const c = AchievementTier.create('BRONZE');
    if (a.isRight() && b.isRight() && c.isRight()) {
      expect(a.value.equals(b.value)).toBe(true);
      expect(a.value.equals(c.value)).toBe(false);
      expect(a.value.toString()).toBe('GOLD');
    }
  });
});

// ── CriteriaOperator ─────────────────────────────────────────────────────────

describe('CriteriaOperator', () => {
  it('creates all valid operators', () => {
    for (const op of Object.values(CriteriaOperatorType)) {
      expect(CriteriaOperator.create(op).isRight()).toBe(true);
    }
  });

  it('returns Left for invalid operator', () => {
    const r = CriteriaOperator.create('<');
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.code).toBe(AchievementErrorCodes.INVALID_OPERATOR);
  });

  it('evaluate() >= operator', () => {
    const r = CriteriaOperator.create('>=');
    if (r.isRight()) {
      expect(r.value.evaluate(10, 10)).toBe(true);
      expect(r.value.evaluate(11, 10)).toBe(true);
      expect(r.value.evaluate(9, 10)).toBe(false);
    }
  });

  it('evaluate() > operator', () => {
    const r = CriteriaOperator.create('>');
    if (r.isRight()) {
      expect(r.value.evaluate(11, 10)).toBe(true);
      expect(r.value.evaluate(10, 10)).toBe(false);
    }
  });

  it('evaluate() == operator', () => {
    const r = CriteriaOperator.create('==');
    if (r.isRight()) {
      expect(r.value.evaluate(10, 10)).toBe(true);
      expect(r.value.evaluate(9, 10)).toBe(false);
    }
  });

  it('equals() and toString() work', () => {
    const a = CriteriaOperator.create('>=');
    const b = CriteriaOperator.create('>=');
    const c = CriteriaOperator.create('>');
    if (a.isRight() && b.isRight() && c.isRight()) {
      expect(a.value.equals(b.value)).toBe(true);
      expect(a.value.equals(c.value)).toBe(false);
      expect(a.value.toString()).toBe('>=');
    }
  });
});

// ── TargetValue ──────────────────────────────────────────────────────────────

describe('TargetValue', () => {
  it('creates valid positive integer', () => {
    const r = TargetValue.create(100);
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe(100);
  });

  it('returns Left for zero', () => {
    expect(TargetValue.create(0).isLeft()).toBe(true);
  });

  it('returns Left for negative', () => {
    expect(TargetValue.create(-1).isLeft()).toBe(true);
  });

  it('returns Left for non-integer', () => {
    expect(TargetValue.create(1.5).isLeft()).toBe(true);
  });

  it('returns Left for NaN', () => {
    expect(TargetValue.create(NaN).isLeft()).toBe(true);
  });

  it('returns Left for Infinity', () => {
    expect(TargetValue.create(Infinity).isLeft()).toBe(true);
  });

  it('equals() works', () => {
    const a = TargetValue.create(10);
    const b = TargetValue.create(10);
    const c = TargetValue.create(20);
    if (a.isRight() && b.isRight() && c.isRight()) {
      expect(a.value.equals(b.value)).toBe(true);
      expect(a.value.equals(c.value)).toBe(false);
    }
  });
});
