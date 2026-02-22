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
  /** Structured workout program with exercise assignments. */
  PROGRAM: 'PROGRAM',
  /** Nutritional prescription with food assignments. */
  DIET_PLAN: 'DIET_PLAN',
  /** Physiological assessment template with measurement fields. */
  ASSESSMENT_TEMPLATE: 'ASSESSMENT_TEMPLATE',
} as const;

export type DeliverableType = (typeof DeliverableType)[keyof typeof DeliverableType];
