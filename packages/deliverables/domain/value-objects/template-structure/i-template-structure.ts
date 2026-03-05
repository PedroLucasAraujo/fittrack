import type { DomainResult } from '@fittrack/core';
import type { DeliverableType } from '../../enums/deliverable-type.js';

/**
 * Snapshot shape returned by `toSnapshot()`.
 *
 * Contains the data needed to create a Deliverable from a template.
 * For TRAINING_PRESCRIPTION, this includes exercises.
 * For other types, only metadata is provided.
 */
export interface TemplateSnapshot {
  type: DeliverableType;
  description: string | null;
  exercises: Array<{
    name: string;
    sets: number | null;
    reps: number | null;
    durationSeconds: number | null;
    restSeconds: number | null;
    notes: string | null;
  }>;
}

/**
 * Common interface for all typed template structures (ADR-0009 §4).
 *
 * Each DeliverableType has a concrete implementation that validates the
 * structure and produces a snapshot for Deliverable creation (ADR-0011).
 */
export interface ITemplateStructure {
  readonly type: DeliverableType;

  /**
   * Validates the structure against type-specific business rules.
   * Must be called before the template can be activated.
   */
  validate(): DomainResult<void>;

  /**
   * Applies parameter values to produce a customised snapshot.
   * Parameter values override defaults where applicable.
   * Returns a plain object snapshot used to create the Deliverable (ADR-0011).
   */
  toSnapshot(parameterValues?: Map<string, string | number | boolean>): TemplateSnapshot;
}
