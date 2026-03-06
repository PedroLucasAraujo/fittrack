import { AchievementDefinition } from '../../domain/aggregates/achievement-definition.js';
import { AchievementCode } from '../../domain/value-objects/achievement-code.js';
import { AchievementName } from '../../domain/value-objects/achievement-name.js';
import { AchievementDescription } from '../../domain/value-objects/achievement-description.js';
import { AchievementCategory } from '../../domain/value-objects/achievement-category.js';
import { AchievementTier } from '../../domain/value-objects/achievement-tier.js';
import { AchievementCriteria } from '../../domain/value-objects/achievement-criteria.js';
import { IconUrl } from '../../domain/value-objects/icon-url.js';

interface MakeDefinitionOptions {
  code?: string;
  name?: string;
  category?: string;
  tier?: string;
  metric?: string;
  operator?: string;
  targetValue?: number;
  active?: boolean;
}

export function makeAchievementDefinition(opts: MakeDefinitionOptions = {}): AchievementDefinition {
  const code = AchievementCode.create(opts.code ?? 'FIRST_WORKOUT');
  const name = AchievementName.create(opts.name ?? 'First Workout');
  const description = AchievementDescription.create('Test achievement');
  const category = AchievementCategory.create(opts.category ?? 'WORKOUT');
  const tier = AchievementTier.create(opts.tier ?? 'BRONZE');
  const criteria = AchievementCriteria.create({
    metric: opts.metric ?? 'workout_count',
    operator: opts.operator ?? '>=',
    targetValue: opts.targetValue ?? 1,
  });
  const iconUrl = IconUrl.create('https://cdn.fittrack.com/achievements/test.png');

  if (
    code.isLeft() ||
    name.isLeft() ||
    description.isLeft() ||
    category.isLeft() ||
    tier.isLeft() ||
    criteria.isLeft() ||
    iconUrl.isLeft()
  ) {
    throw new Error(`makeAchievementDefinition: VO creation failed`);
  }

  const definitionResult = AchievementDefinition.create({
    code: code.value,
    name: name.value,
    description: description.value,
    category: category.value,
    tier: tier.value,
    criteria: criteria.value,
    iconUrl: iconUrl.value,
  });

  if (definitionResult.isLeft()) {
    throw new Error('makeAchievementDefinition: aggregate creation failed');
  }

  const definition = definitionResult.value;

  if (opts.active) {
    definition.activate();
  }

  return definition;
}
