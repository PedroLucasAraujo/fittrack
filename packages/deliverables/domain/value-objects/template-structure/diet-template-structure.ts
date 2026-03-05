import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { DeliverableType } from '../../enums/deliverable-type.js';
import { InvalidTemplateStructureError } from '../../errors/invalid-template-structure-error.js';
import type { ITemplateStructure, TemplateSnapshot } from './i-template-structure.js';

export interface DietFoodRef {
  /** Optional reference to Catalog food (ADR-0047 — ID only). */
  catalogItemId: string | null;
  name: string;
  quantity: string | null;
  notes: string | null;
}

export interface MealTemplate {
  name: string;
  /** Optional time of day, e.g. "08:00". */
  time: string | null;
  foods: DietFoodRef[];
}

/**
 * Template structure for DIET_PLAN deliverables.
 *
 * Contains one or more meal templates, each describing foods to include.
 * Catalog references are by ID only (ADR-0047).
 *
 * Validation rules:
 *   - At least one meal required.
 *   - Each meal must have a name.
 */
export class DietTemplateStructure implements ITemplateStructure {
  readonly type = DeliverableType.DIET_PLAN;

  private constructor(private readonly meals: MealTemplate[]) {}

  static create(meals: MealTemplate[]): DietTemplateStructure {
    return new DietTemplateStructure(meals.map((m) => ({ ...m, foods: [...m.foods] })));
  }

  /** Returns a copy of the meals array. */
  getMeals(): MealTemplate[] {
    return this.meals.map((m) => ({ ...m, foods: [...m.foods] }));
  }

  validate(): DomainResult<void> {
    if (this.meals.length === 0) {
      return left(
        new InvalidTemplateStructureError('DIET_PLAN template must have at least one meal'),
      );
    }

    for (const meal of this.meals) {
      if (!meal.name || meal.name.trim().length === 0) {
        return left(new InvalidTemplateStructureError('each meal must have a name'));
      }
    }

    return right(undefined);
  }

  toSnapshot(_parameterValues?: Map<string, string | number | boolean>): TemplateSnapshot {
    const mealSummary = this.meals.map((m) => `${m.name} (${m.foods.length} food(s))`).join(', ');

    return {
      type: DeliverableType.DIET_PLAN,
      description: `Meals: ${mealSummary}`,
      exercises: [],
    };
  }
}
