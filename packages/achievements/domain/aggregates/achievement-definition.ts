import { AggregateRoot, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { AchievementCode } from '../value-objects/achievement-code.js';
import type { AchievementName } from '../value-objects/achievement-name.js';
import type { AchievementDescription } from '../value-objects/achievement-description.js';
import type { AchievementCategory } from '../value-objects/achievement-category.js';
import type { AchievementTier } from '../value-objects/achievement-tier.js';
import type { AchievementCriteria } from '../value-objects/achievement-criteria.js';
import type { IconUrl } from '../value-objects/icon-url.js';
import { InvalidAchievementDefinitionError } from '../errors/invalid-achievement-definition-error.js';

export interface AchievementDefinitionProps {
  /** Unique human-readable code (e.g., FIRST_WORKOUT). Immutable. */
  code: AchievementCode;
  /** Display name shown to users. Immutable. */
  name: AchievementName;
  /** Descriptive text explaining the achievement. Immutable. */
  description: AchievementDescription;
  /** Behavioral category for grouping. Immutable. */
  category: AchievementCategory;
  /** Tier representing difficulty/prestige. Immutable. */
  tier: AchievementTier;
  /**
   * Evaluation criteria (metric, operator, target). Immutable after creation
   * — snapshot rule analogous to ADR-0011.
   */
  criteria: AchievementCriteria;
  /** URL to the badge icon. Immutable. */
  iconUrl: IconUrl;
  /**
   * Whether this achievement can be earned multiple times.
   * MVP: always false — achievements are unique per user.
   */
  isRepeatable: boolean;
  /**
   * Whether this definition is visible and eligible for unlock evaluation.
   * Managed via activate() / deactivate(). Mutable.
   */
  active: boolean;
  /** UTC ISO string when this definition was created. Immutable. */
  createdAtUtc: string;
}

/**
 * AchievementDefinition aggregate root — the platform-wide configuration
 * for a single type of achievement.
 *
 * ## Immutability
 * Once created, all business fields (code, name, description, category, tier,
 * criteria, iconUrl) are immutable. Only `active` is mutable via activate()
 * / deactivate().
 *
 * ## Active flag (ADR-0022 analogy — no terminal enum states)
 * `active` is a boolean managed through methods, not a status enum.
 * isActive() is the canonical check.
 *
 * ## Tenant scope
 * Definitions are platform-wide, not tenant-scoped. professionalProfileId
 * is NOT part of this aggregate.
 *
 * ## Domain events (ADR-0009 §3)
 * Aggregates do not collect events. The Application layer constructs and
 * dispatches AchievementDefinitionCreatedEvent / AchievementDefinitionActivatedEvent.
 */
export class AchievementDefinition extends AggregateRoot<AchievementDefinitionProps> {
  private constructor(id: string, props: AchievementDefinitionProps, version: number = 0) {
    super(id, props, version);
  }

  static create(props: {
    id?: string;
    code: AchievementCode;
    name: AchievementName;
    description: AchievementDescription;
    category: AchievementCategory;
    tier: AchievementTier;
    criteria: AchievementCriteria;
    iconUrl: IconUrl;
    isRepeatable?: boolean;
  }): DomainResult<AchievementDefinition> {
    const id = props.id ?? generateId();
    const definition = new AchievementDefinition(
      id,
      {
        code: props.code,
        name: props.name,
        description: props.description,
        category: props.category,
        tier: props.tier,
        criteria: props.criteria,
        iconUrl: props.iconUrl,
        isRepeatable: props.isRepeatable ?? false,
        active: false,
        createdAtUtc: new Date().toISOString(),
      },
      0,
    );
    return right(definition);
  }

  static reconstitute(
    id: string,
    props: AchievementDefinitionProps,
    version: number,
  ): AchievementDefinition {
    return new AchievementDefinition(id, props, version);
  }

  // ── State transitions ──────────────────────────────────────────────────────

  /**
   * Makes the achievement available for unlock evaluation.
   * Returns error if already active.
   */
  activate(): DomainResult<void> {
    if (this.props.active) {
      return left(
        new InvalidAchievementDefinitionError(
          `achievement "${this.props.code.value}" is already active`,
        ),
      );
    }
    this.props.active = true;
    return right(undefined);
  }

  /**
   * Hides the achievement from unlock evaluation.
   * Returns error if already inactive.
   */
  deactivate(): DomainResult<void> {
    if (!this.props.active) {
      return left(
        new InvalidAchievementDefinitionError(
          `achievement "${this.props.code.value}" is already inactive`,
        ),
      );
    }
    this.props.active = false;
    return right(undefined);
  }

  // ── Query helpers ──────────────────────────────────────────────────────────

  /** True when this definition is available for unlock evaluation (ADR-0022 — method, not enum). */
  isActive(): boolean {
    return this.props.active;
  }

  /**
   * Evaluates whether the given currentValue satisfies this achievement's criteria.
   * Delegates to AchievementCriteria.evaluate().
   */
  matchesCriteria(currentValue: number): boolean {
    return this.props.criteria.evaluate(currentValue);
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get code(): AchievementCode {
    return this.props.code;
  }

  get name(): AchievementName {
    return this.props.name;
  }

  get description(): AchievementDescription {
    return this.props.description;
  }

  get category(): AchievementCategory {
    return this.props.category;
  }

  get tier(): AchievementTier {
    return this.props.tier;
  }

  get criteria(): AchievementCriteria {
    return this.props.criteria;
  }

  get iconUrl(): IconUrl {
    return this.props.iconUrl;
  }

  get isRepeatable(): boolean {
    return this.props.isRepeatable;
  }

  get createdAtUtc(): string {
    return this.props.createdAtUtc;
  }
}
