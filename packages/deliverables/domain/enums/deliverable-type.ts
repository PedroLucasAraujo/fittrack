/**
 * Registered Deliverable types (ADR-0044 §1).
 *
 * Every type must satisfy the ADR-0044 §2 requirements:
 * snapshot mandatory, AccessGrant required, subscription-first,
 * Execution required (if executable), tenant-scoped.
 *
 * New types must not be added without an ADR amendment.
 */
export const DeliverableType = {
  /** Structured workout prescription with ordered exercise assignments. */
  TRAINING_PRESCRIPTION: 'TRAINING_PRESCRIPTION',
  /** Nutritional prescription with food assignments. */
  DIET_PLAN: 'DIET_PLAN',
  /** Physiological assessment with measurement fields. */
  PHYSIOLOGICAL_ASSESSMENT: 'PHYSIOLOGICAL_ASSESSMENT',
} as const;

export type DeliverableType = (typeof DeliverableType)[keyof typeof DeliverableType];
